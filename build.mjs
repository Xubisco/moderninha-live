// Gera o site estático em docs/ a partir de dados/produtos.json, dados/ofertas.json e dados/config.json.
// Uso: node build.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
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
const CATEGORIAS = [
  ["sofas", "Sofás"],
  ["guarda-roupas", "Guarda-Roupas"],
  ["mesas", "Mesas"],
  ["cozinhas", "Cozinhas"],
  ["racks-bancadas", "Racks e Bancadas"],
  ["camas-colchoes", "Camas e Colchões"],
];
// Endereços antigos (da fase "uma página por live") que continuam funcionando
const ENDERECOS_ANTIGOS = ["live", "live/2026-11-10"];

const lerJson = (caminho) => JSON.parse(readFileSync(join(SITE, caminho), "utf8"));
const produtos = lerJson("dados/produtos.json");
const ofertas = lerJson("dados/ofertas.json").itens;
const config = lerJson("dados/config.json");

const avisos = [];
const moeda = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const centavos = (v) => Math.round(v * 100) / 100;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const linkWhats = (texto) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
const fotosDe = (produto) => produto.fotos.map((_, i) => `img/${produto.slug}/${i + 1}.webp`);
const menorParcela = (item) => Math.min(...item.ofertas.map((o) => o.parcela));

for (const item of ofertas) {
  const produto = produtos[item.codigo];
  if (!produto) throw new Error(`Produto ${item.codigo} de ofertas.json não está em produtos.json`);
  if (!CATEGORIAS.some(([id]) => id === produto.categoria)) throw new Error(`${produto.nome}: categoria "${produto.categoria}" desconhecida`);
}

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

// Pixel da Meta: PageView em todas as páginas; ViewContent, InitiateCheckout e Contact via data-pixel.
function pixel() {
  if (!config.pixelMeta) return "";
  return `<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${esc(config.pixelMeta)}');
fbq('track', 'PageView');
document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-pixel]');
  if (el) fbq('track', el.dataset.pixel, JSON.parse(el.dataset.pixelDados || '{}'));
});
</script>`;
}

function pagina({ raiz, titulo, descricao, imagem, url, corpo, extraHead = "" }) {
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
${pixel()}${extraHead}
</head>
<body>
<header class="topo"><a class="marca" href="${raiz}">moderninha <span>móveis</span></a></header>
${corpo}
<footer class="rodape">
  <p>Moderninha Móveis · <a href="https://www.instagram.com/${INSTAGRAM}/">@${INSTAGRAM}</a></p>
  <p><a href="${linkWhats("Olá! Vim pelo site de ofertas.")}" data-pixel="Contact">Fale conosco pelo WhatsApp</a></p>
</footer>
</body>
</html>
`;
}

function blocoEntrega() {
  return `<section class="bloco entrega">
    <h2>Entrega</h2>
    <p>Frete fixo de ${moeda(FRETE)}, já incluído no pagamento. Entregamos em: ${CIDADES.join(", ")}.</p>
    <p>Depois de pagar, envie o comprovante pelo WhatsApp para combinar endereço e entrega.</p>
  </section>`;
}

function card(item) {
  const produto = produtos[item.codigo];
  const aPartir = item.ofertas.length > 1 ? "a partir de " : "";
  return `<a class="card${item.esgotado ? " esgotado" : ""}" href="p/${produto.slug}/">
  <div class="card-foto"><img src="${fotosDe(produto)[0]}" alt="${esc(produto.nome)}" loading="lazy" decoding="async">${item.esgotado ? '<span class="selo">Esgotado</span>' : ""}</div>
  <div class="card-info">
    <h3>${esc(produto.nome)}</h3>
    <p class="card-preco"><small>${aPartir}12x de</small> ${moeda(menorParcela(item))}</p>
    <p class="card-juros">sem juros</p>
  </div>
</a>`;
}

function paginaInicial() {
  const grupos = CATEGORIAS.map(([id, nome]) => [id, nome, ofertas.filter((o) => produtos[o.codigo].categoria === id)]).filter(([, , itens]) => itens.length);
  const atalhos = grupos.map(([id, nome]) => `<a href="#${id}">${esc(nome)}</a>`).join("");
  const secoes = grupos
    .map(([id, nome, itens]) => `<section class="categoria" id="${id}">
    <h2>${esc(nome)}</h2>
    <div class="grade">
${itens.map(card).join("\n")}
    </div>
  </section>`)
    .join("\n  ");
  return pagina({
    raiz: "",
    titulo: "Ofertas | Moderninha Móveis",
    descricao: "Ofertas da Moderninha Móveis em até 12x sem juros, com entrega em Recife e região metropolitana.",
    imagem: fotosDe(produtos[ofertas[0].codigo])[0],
    url: "",
    corpo: `<nav class="atalhos" aria-label="Categorias">${atalhos}</nav>
<main class="conteudo">
  <section class="chamada">
    <h1>Ofertas Moderninha</h1>
    <p>Em até 12x sem juros no Mercado Pago. Frete de ${moeda(FRETE)} para Recife e região metropolitana.</p>
  </section>
  ${secoes}
  ${blocoEntrega()}
</main>`,
  });
}

function blocoOferta(item, oferta, produto) {
  const p = precos(oferta.parcela);
  let botao;
  if (item.esgotado) {
    botao = `<span class="botao desativado">Esgotado</span>`;
  } else if (!oferta.link) {
    botao = `<span class="botao desativado">Link em breve</span>`;
    avisos.push(`${produto.nome}${oferta.rotulo ? ` (${oferta.rotulo})` : ""}`);
  } else {
    const dados = esc(JSON.stringify({ content_ids: [item.codigo], content_type: "product", value: p.total, currency: "BRL" }));
    botao = `<a class="botao comprar" href="${esc(oferta.link)}" target="_blank" rel="noopener" data-pixel="InitiateCheckout" data-pixel-dados="${dados}">Comprar no Mercado Pago</a>`;
  }
  return `<div class="oferta">
    ${oferta.rotulo ? `<h3>${esc(oferta.rotulo)}</h3>` : ""}
    <p class="parcela">12x de <strong>${moeda(p.parcela)}</strong> <span>sem juros</span></p>
    <p class="conta">Produto ${moeda(p.produto)} + frete ${moeda(FRETE)}</p>
    <p class="total">Total ${moeda(p.total)} em 12x de ${moeda(p.parcelaTotal)} sem juros</p>
    ${botao}
  </div>`;
}

function paginaDoProduto(item) {
  const produto = produtos[item.codigo];
  const raiz = "../../";
  const fotos = fotosDe(produto);
  const galeria = fotos
    .map((f, i) => `<img src="${raiz}${f}" alt="${esc(produto.nome)}, foto ${i + 1} de ${fotos.length}"${i ? ' loading="lazy"' : ""} decoding="async">`)
    .join("\n      ");
  const lista = (itens) => `<ul>${itens.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`;
  const medidas = produto.medidas.map(([nome, valor]) => `<tr><th>${esc(nome)}</th><td>${esc(valor)}</td></tr>`).join("");
  const menor = menorParcela(item);
  const viewContent = config.pixelMeta
    ? `<script>fbq('track', 'ViewContent', ${JSON.stringify({ content_ids: [item.codigo], content_name: produto.nome, content_type: "product", value: precos(menor).total, currency: "BRL" })});</script>`
    : "";
  return pagina({
    raiz,
    titulo: `${produto.nome} | Moderninha Móveis`,
    descricao: `${produto.nome} em 12x de ${moeda(menor)} sem juros na Moderninha Móveis.`,
    imagem: fotos[0],
    url: `p/${produto.slug}/`,
    extraHead: viewContent,
    corpo: `<main class="conteudo produto">
  <a class="voltar" href="${raiz}#${produto.categoria}">← Ver todas as ofertas</a>
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
  ${item.esgotado ? '<p class="aviso-esgotado">Este produto esgotou.</p>' : ""}
  ${item.ofertas.map((o) => blocoOferta(item, o, produto)).join("\n  ")}
  ${produto.cores ? `<p class="nota"><strong>Cores:</strong> ${esc(produto.cores)}</p>` : ""}
  <p class="nota">Depois de pagar, envie o comprovante pelo WhatsApp para combinar endereço e entrega.</p>
  <a class="botao whatsapp" href="${linkWhats(`Olá! Tenho uma dúvida sobre o ${produto.nome} (cód. ${item.codigo}).`)}" target="_blank" rel="noopener" data-pixel="Contact">Tirar dúvidas no WhatsApp</a>
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

const redirecionar = (destino) =>
  `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${destino}"><title>Moderninha Móveis</title><a href="${destino}">Ver ofertas</a>\n`;

// Limpa as páginas geradas (mantém as fotos já otimizadas)
for (const pasta of ["p", "live"]) {
  if (existsSync(join(DOCS, pasta))) rmSync(join(DOCS, pasta), { recursive: true });
}

gravar("index.html", paginaInicial());
for (const item of ofertas) gravar(`p/${produtos[item.codigo].slug}/index.html`, paginaDoProduto(item));
for (const antigo of ENDERECOS_ANTIGOS) gravar(`${antigo}/index.html`, redirecionar("/"));
// Páginas de produto antigas (/live/2026-11-10/<produto>/) levam para a página nova do produto
for (const item of ofertas) {
  const slug = produtos[item.codigo].slug;
  gravar(`live/2026-11-10/${slug}/index.html`, redirecionar(`/p/${slug}/`));
}
gravar("CNAME", `${DOMINIO}\n`);
gravar(".nojekyll", "");
writeFileSync(join(DOCS, "estilo.css"), readFileSync(join(SITE, "estilo.css")));

console.log(`${ofertas.length} produtos em oferta. Pixel da Meta: ${config.pixelMeta || "não configurado"}.`);
if (avisos.length) {
  console.log(`\nAtenção, ${avisos.length} botão(ões) sem link do Mercado Pago:`);
  for (const a of [...new Set(avisos)]) console.log(`- ${a}`);
}
