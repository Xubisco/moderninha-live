"""Otimiza as fotos dos produtos para a web.

Lê dados/produtos.json, converte cada foto para WebP (lado maior de até 1400 px)
e grava em docs/img/<slug>/<n>.webp. Fotos já convertidas são puladas;
use --forcar para refazer todas.
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


if __name__ == "__main__":
    main()
