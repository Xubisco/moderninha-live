// Gera o site estático em docs/ a partir de dados/produtos.json e dados/lives/*.json.
// Uso: node build.mjs
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = dirname(fileURLToPath(import.meta.url));
const DOCS = join(SITE, "docs");
const DOMINIO = "live.moderninhamoveis.com.br";
const URL_BASE = `https://${DOMINIO}`;
const WHATSAPP = "5581994998461";
const INSTAGRAM = "moderninhamoveis";
const FRETE = 100;
const PARCELAS = 12;
const CIDADES = ["Recife", "Jaboatão", "Olinda", "Paulista", "Abreu e Lima", "Camaragibe", "São Lourenço"];

const lerJson = (caminho) => JSON.parse(readFileSync(join(SITE, caminho), "utf8"));
const produtos = lerJson("dados/produtos.json");
const lives = readdirSync(join(SITE, "dados/lives"))
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => lerJson(`dados/lives/${f}`));

const avisos = [];
const moeda = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const centavos = (v) => Math.round(v * 100) / 100;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const dataCurta = (iso) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
const linkWhats = (texto) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
const fotosDe = (produto) => produto.fotos.map((_, i) => `img/${produto.slug}/${i + 1}.webp`);

function precos(parcela) {
  const produto = centavos(parcela * PARCELAS);
  const total = centavos(produto + FRETE);
  return { parcela, produto, total, parcelaTotal: centavos(total / PARCELAS) };
}

function gravar(caminho, html) {
  const destino = join(DOCS, caminho);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, html);
}

function pagina({ raiz, titulo, descricao, imagem, url, corpo }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descricao)}">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${URL_BASE}/${url}">
${imagem ? `<meta property="og:image" content="${URL_BASE}/${imagem}">` : ""}
<meta name="theme-color" content="#c8205f">
<link rel="stylesheet" href="${raiz}estilo.css">
</head>
<body>
<header class="topo"><a class="marca" href="${raiz}live/">moderninha <span>móveis</span></a></header>
${corpo}
<footer class="rodape">
  <p>Moderninha Móveis · <a href="https://www.instagram.com/${INSTAGRAM}/">@${INSTAGRAM}</a></p>
  <p><a href="${linkWhats("Olá! Vim pelo site da live.")}">Fale conosco pelo WhatsApp</a></p>
</footer>
</body>
</html>
`;
}

function paginaDaLive(live, raiz, prefixoProdutos) {
  const cards = live.itens.map((item) => {
    const produto = produtos[item.codigo];
    if (!produto) throw new Error(`Produto ${item.codigo} da live ${live.data} não está em produtos.json`);
    const menor = Math.min(...item.ofertas.map((o) => o.parcela));
    const aPartir = item.ofertas.length > 1 ? "a partir de " : "";
    return `<a class="card${item.esgotado ? " esgotado" : ""}" href="${prefixoProdutos}${produto.slug}/">
  <div class="card-foto"><img src="${raiz}${fotosDe(produto)[0]}" alt="${esc(produto.nome)}" loading="lazy" decoding="async">${item.esgotado ? '<span class="selo">Esgotado</span>' : ""}</div>
  <div class="card-info">
    <h2>${esc(produto.nome)}</h2>
    <p class="card-preco"><small>${aPartir}12x de</small> ${moeda(menor)}</p>
    <p class="card-juros">sem juros</p>
  </div>
</a>`;
  });
  const primeira = produtos[live.itens[0].codigo];
  return pagina({
    raiz,
    titulo: `${live.titulo} | Moderninha Móveis`,
    descricao: `Ofertas da live da Moderninha Móveis. Em até 12x sem juros, com entrega em Recife e região.`,
    imagem: fotosDe(primeira)[0],
    url: `live/${live.data}/`,
    corpo: `<main class="conteudo">
  <section class="chamada">
    <h1>Ofertas da live <span>${dataCurta(live.data)}</span></h1>
    <p>Em até 12x sem juros no Mercado Pago. Frete de ${moeda(FRETE)} para Recife e região metropolitana.</p>
  </section>
  <section class="grade">
${cards.join("\n")}
  </section>
  ${blocoEntrega()}
</main>`,
  });
}

function blocoEntrega() {
  return `<section class="bloco entrega">
    <h2>Entrega</h2>
    <p>Frete fixo de ${moeda(FRETE)}, já incluído no pagamento. Entregamos em: ${CIDADES.join(", ")}.</p>
    <p>Depois de pagar, envie o comprovante pelo WhatsApp para combinar endereço e entrega.</p>
  </section>`;
}

function blocoOferta(item, oferta, produto) {
  const p = precos(oferta.parcela);
  let botao;
  if (item.esgotado) {
    botao = `<span class="botao desativado">Esgotado</span>`;
  } else if (!oferta.link) {
    botao = `<span class="botao desativado">Link em breve</span>`;
    avisos.push(`${produto.nome}${oferta.rotulo ? ` (${oferta.rotulo})` : ""}: sem link do Mercado Pago`);
  } else {
    botao = `<a class="botao comprar" href="${esc(oferta.link)}" target="_blank" rel="noopener">Comprar no Mercado Pago</a>`;
  }
  return `<div class="oferta">
    ${oferta.rotulo ? `<h3>${esc(oferta.rotulo)}</h3>` : ""}
    <p class="parcela">12x de <strong>${moeda(p.parcela)}</strong> <span>sem juros</span></p>
    <p class="conta">Produto ${moeda(p.produto)} + frete ${moeda(FRETE)}</p>
    <p class="total">Total ${moeda(p.total)} em 12x de ${moeda(p.parcelaTotal)} sem juros</p>
    ${botao}
  </div>`;
}

function paginaDoProduto(live, item) {
  const produto = produtos[item.codigo];
  const raiz = "../../../";
  const fotos = fotosDe(produto);
  const galeria = fotos
    .map((f, i) => `<img src="${raiz}${f}" alt="${esc(produto.nome)}, foto ${i + 1} de ${fotos.length}"${i ? ' loading="lazy"' : ""} decoding="async">`)
    .join("\n      ");
  const ofertas = item.ofertas.map((o) => blocoOferta(item, o, produto)).join("\n  ");
  const lista = (itens) => `<ul>${itens.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`;
  const medidas = produto.medidas.map(([nome, valor]) => `<tr><th>${esc(nome)}</th><td>${esc(valor)}</td></tr>`).join("");
  const menor = Math.min(...item.ofertas.map((o) => o.parcela));
  return pagina({
    raiz,
    titulo: `${produto.nome} | Moderninha Móveis`,
    descricao: `${produto.nome} em 12x de ${moeda(menor)} sem juros. Oferta da live da Moderninha Móveis.`,
    imagem: fotos[0],
    url: `live/${live.data}/${produto.slug}/`,
    corpo: `<main class="conteudo produto">
  <a class="voltar" href="../">← Todos os produtos da live</a>
  <div class="galeria-caixa">
    <div class="galeria" id="galeria">
      ${galeria}
    </div>
    ${fotos.length > 1 ? `<button class="seta anterior" id="anterior" type="button" aria-label="Foto anterior" disabled>‹</button>
    <button class="seta proxima" id="proxima" type="button" aria-label="Próxima foto">›</button>
    <span class="contador" id="contador">1/${fotos.length}</span>` : ""}
  </div>
  <h1>${esc(produto.nome)}</h1>
  <p class="codigo">Cód. ${esc(item.codigo.replace("-", " + "))}</p>
  ${item.esgotado ? '<p class="aviso-esgotado">Este produto esgotou na live.</p>' : ""}
  ${ofertas}
  ${produto.cores ? `<p class="nota"><strong>Cores:</strong> ${esc(produto.cores)}</p>` : ""}
  <p class="nota">Depois de pagar, envie o comprovante pelo WhatsApp para combinar endereço e entrega.</p>
  <a class="botao whatsapp" href="${linkWhats(`Olá! Tenho uma dúvida sobre o ${produto.nome} (cód. ${item.codigo}) da live.`)}" target="_blank" rel="noopener">Tirar dúvidas no WhatsApp</a>
  <section class="bloco">
    <h2>Descrição</h2>
    ${produto.descricao.map((p) => `<p>${esc(p)}</p>`).join("\n    ")}
  </section>
  <section class="bloco">
    <h2>Características</h2>
    ${lista(produto.caracteristicas)}
  </section>
  <section class="bloco">
    <h2>Medidas</h2>
    <table class="medidas">${medidas}</table>
    ${produto.observacao ? `<p class="obs">${esc(produto.observacao)}</p>` : ""}
  </section>
  ${blocoEntrega()}
</main>
<script>
  const galeria = document.getElementById("galeria");
  const contador = document.getElementById("contador");
  const anterior = document.getElementById("anterior");
  const proxima = document.getElementById("proxima");
  if (contador) {
    const total = galeria.children.length;
    const atual = () => Math.round(galeria.scrollLeft / galeria.clientWidth);
    const irPara = (i) => galeria.scrollTo({ left: Math.max(0, Math.min(total - 1, i)) * galeria.clientWidth, behavior: "smooth" });
    galeria.addEventListener("scroll", () => {
      const i = atual();
      contador.textContent = i + 1 + "/" + total;
      anterior.disabled = i === 0;
      proxima.disabled = i === total - 1;
    }, { passive: true });
    anterior.addEventListener("click", () => irPara(atual() - 1));
    proxima.addEventListener("click", () => irPara(atual() + 1));
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") irPara(atual() - 1);
      if (e.key === "ArrowRight") irPara(atual() + 1);
    });
  }
</script>`,
  });
}

// Limpa as páginas geradas (mantém as fotos já otimizadas)
for (const pasta of ["live"]) {
  if (existsSync(join(DOCS, pasta))) rmSync(join(DOCS, pasta), { recursive: true });
}

for (const live of lives) {
  gravar(`live/${live.data}/index.html`, paginaDaLive(live, "../../", ""));
  for (const item of live.itens) {
    gravar(`live/${live.data}/${produtos[item.codigo].slug}/index.html`, paginaDoProduto(live, item));
  }
}
const atual = lives.at(-1);
gravar("live/index.html", paginaDaLive(atual, "../", `${atual.data}/`));
gravar("index.html", `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=live/"><title>Moderninha Móveis</title><a href="live/">Ver ofertas da live</a>\n`);
gravar("CNAME", `${DOMINIO}\n`);
gravar(".nojekyll", "");
writeFileSync(join(DOCS, "estilo.css"), readFileSync(join(SITE, "estilo.css")));

console.log(`Live atual: ${atual.data} (${atual.itens.length} produtos), ${lives.length} live(s) gerada(s).`);
if (avisos.length) {
  console.log(`\nAtenção, ${avisos.length} botão(ões) sem link:`);
  for (const a of [...new Set(avisos)]) console.log(`- ${a}`);
}
