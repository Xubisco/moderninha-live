"""Grava o link do Mercado Pago de um produto no site e no TXT do produto.

Uso:
    python link.py <codigo> <url>              produto com um link só
    python link.py <codigo> <url> <n>          n-ésima oferta (ex.: Adele 1, 2, 3)

Confere se o código existe, grava o link em dados/ofertas.json e reescreve,
no fim do TXT da pasta de fotos do produto, um bloco com todos os links dele
(valor = parcela x 12 + frete). O bloco anterior é substituído, não acumulado.
O TXT mantém a codificação e as quebras de linha originais.
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

SITE = Path(__file__).resolve().parent
ECOMERCE = SITE.parent
FRETE = 100
PARCELAS = 12
INICIO = "--- LINK MERCADO PAGO"
FIM = "--- FIM LINK ---"


def reais(valor):
    texto = f"{valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"R$ {texto}"


def salvar_ofertas(caminho, dados):
    linhas = [json.dumps(item, ensure_ascii=False) for item in dados["itens"]]
    texto = '{\n  "itens": [\n    ' + ",\n    ".join(linhas) + "\n  ]\n}\n"
    caminho.write_text(texto, encoding="utf-8")


def ler_txt(caminho):
    bruto = caminho.read_bytes()
    try:
        return bruto.decode("utf-8"), "utf-8"
    except UnicodeDecodeError:
        return bruto.decode("cp1252"), "cp1252"


def bloco(item, nl):
    linhas = [f"{INICIO} (atualizado em {date.today():%d/%m/%Y}) ---"]
    for oferta in item["ofertas"]:
        produto = round(oferta["parcela"] * PARCELAS, 2)
        if oferta.get("rotulo"):
            linhas.append(oferta["rotulo"] + ":")
        linhas.append(f"{PARCELAS}x {reais(oferta['parcela'])} = {reais(produto)} + frete {reais(FRETE)} = {reais(produto + FRETE)}")
        linhas.append(oferta["link"] or "(sem link)")
    linhas.append(FIM)
    return nl.join(linhas)


def main():
    if len(sys.argv) not in (3, 4):
        sys.exit(__doc__)
    codigo, url = sys.argv[1], sys.argv[2]
    indice = int(sys.argv[3]) - 1 if len(sys.argv) == 4 else 0
    if not re.match(r"^https://(mpago\.la|mpago\.li|link\.mercadopago\.com\.br|www\.mercadopago\.com\.br)/", url):
        sys.exit(f"Link não parece ser do Mercado Pago: {url}")

    caminho_ofertas = SITE / "dados" / "ofertas.json"
    ofertas = json.loads(caminho_ofertas.read_text(encoding="utf-8"))
    produtos = json.loads((SITE / "dados" / "produtos.json").read_text(encoding="utf-8"))
    item = next((i for i in ofertas["itens"] if i["codigo"] == codigo), None)
    if not item or codigo not in produtos:
        sys.exit(f"Código {codigo} não está nas ofertas.")
    if len(item["ofertas"]) > 1 and len(sys.argv) == 3:
        rotulos = ", ".join(f"{n} = {o.get('rotulo')}" for n, o in enumerate(item["ofertas"], 1))
        sys.exit(f"{codigo} tem {len(item['ofertas'])} links; informe qual: {rotulos}")
    oferta = item["ofertas"][indice]
    oferta["link"] = url
    salvar_ofertas(caminho_ofertas, ofertas)
    total = round(oferta["parcela"] * PARCELAS + FRETE, 2)
    print(f"{produtos[codigo]['nome']} {oferta.get('rotulo', '')}: link deve cobrar {reais(total)}")

    pasta = ECOMERCE / produtos[codigo]["pastaFotos"]
    txts = sorted(pasta.glob("*.txt")) + sorted(pasta.glob("*.TXT"))
    if not txts:
        print(f"AVISO: nenhum TXT em {pasta}; link gravado só no site.")
        return
    txt = txts[0]
    texto, codificacao = ler_txt(txt)
    nl = "\r\n" if "\r\n" in texto else "\n"
    texto = re.sub(r"\s*" + re.escape(INICIO) + r".*?" + re.escape(FIM) + r"\s*$", "", texto, flags=re.S)
    texto = texto.rstrip() + nl + nl + bloco(item, nl) + nl
    txt.write_bytes(texto.encode(codificacao))
    print(f"TXT atualizado: {txt.relative_to(ECOMERCE)} ({codificacao})")


if __name__ == "__main__":
    main()
