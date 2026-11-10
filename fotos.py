"""Otimiza as fotos dos produtos e os arquivos da marca para a web.

Lê dados/produtos.json, converte cada foto para WebP (lado maior de até 1400 px)
e grava em docs/img/<slug>/<n>.webp. Fotos já convertidas são puladas;
use --forcar para refazer todas.

Também gera em docs/marca/ o logo do cabeçalho, o símbolo decorativo e os
ícones do navegador, a partir dos originais em marca/.
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageOps

SITE = Path(__file__).resolve().parent
ECOMERCE = SITE.parent
LADO_MAXIMO = 1400
QUALIDADE = 80


def main():
    forcar = "--forcar" in sys.argv
    produtos = json.loads((SITE / "dados" / "produtos.json").read_text(encoding="utf-8"))
    total = 0
    for codigo, produto in produtos.items():
        destino = SITE / "docs" / "img" / produto["slug"]
        destino.mkdir(parents=True, exist_ok=True)
        for n, foto in enumerate(produto["fotos"], start=1):
            if isinstance(foto, str):
                foto = {"arquivo": foto}
            saida = destino / f"{n}.webp"
            if saida.exists() and not forcar:
                continue
            origem = ECOMERCE / produto["pastaFotos"] / foto["arquivo"]
            img = ImageOps.exif_transpose(Image.open(origem)).convert("RGB")
            if foto.get("cortarTopo"):
                img = img.crop((0, int(img.height * foto["cortarTopo"]), img.width, img.height))
            img.thumbnail((LADO_MAXIMO, LADO_MAXIMO))
            img.save(saida, "WEBP", quality=QUALIDADE, method=6)
            total += 1
            print(f"{codigo} {saida.relative_to(SITE)} {img.size[0]}x{img.size[1]} {saida.stat().st_size // 1024} KB")
    print(f"{total} foto(s) convertida(s)")
    marca()


def recortada(nome):
    """Abre um PNG da marca sem as margens transparentes."""
    img = Image.open(SITE / "marca" / nome).convert("RGBA")
    return img.crop(img.getbbox())


def marca():
    destino = SITE / "docs" / "marca"
    destino.mkdir(parents=True, exist_ok=True)
    # Logo do cabeçalho em 2x (exibido com 44 px de altura)
    logo = recortada("logo-horizontal.png")
    logo.thumbnail((10_000, 88))
    logo.save(destino / "logo.png", optimize=True)
    # Símbolo branco usado como forma decorativa na faixa de cima
    simbolo = recortada("simbolo-negativo.png")
    simbolo.thumbnail((640, 640))
    simbolo.save(destino / "simbolo-branco.png", optimize=True)
    # Ícones: o submark quente já tem o círculo com gradiente
    icone = recortada("submark-quente.png")
    lado = max(icone.size)
    quadrado = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    quadrado.paste(icone, ((lado - icone.width) // 2, (lado - icone.height) // 2))
    for tamanho, nome in [(32, "favicon-32.png"), (180, "apple-touch-icon.png"), (512, "icone-512.png")]:
        quadrado.resize((tamanho, tamanho), Image.LANCZOS).save(destino / nome, optimize=True)
    print("marca: " + ", ".join(sorted(p.name for p in destino.iterdir())))


if __name__ == "__main__":
    main()
