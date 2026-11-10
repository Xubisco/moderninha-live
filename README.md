# Site de ofertas da Moderninha Móveis

Site estático publicado em https://ofertas.moderninhamoveis.com.br pelo GitHub Pages (pasta `docs/`).
Uma página com todos os produtos em campanha, por categoria, e uma página por produto em `/p/<produto>/`.

- `dados/produtos.json`: cadastro dos produtos (categoria, fotos, descrição, características, medidas), pelo código do ERP.
- `dados/ofertas.json`: produtos em campanha, com parcela, link do Mercado Pago e esgotado.
- `dados/config.json`: ID do Pixel da Meta (vazio = sem Pixel).
- `fotos.py`: converte as fotos dos produtos para WebP em `docs/img/`.
- `build.mjs`: gera as páginas em `docs/`.

Categorias: `sofas`, `guarda-roupas`, `mesas`, `cozinhas`, `racks-bancadas`, `camas-colchoes` e `acessorios` (para o que não se encaixa nas outras).

## Rotina

1. Produto novo: cadastrar em `dados/produtos.json` e incluir em `dados/ofertas.json`.
2. Preço mudou: trocar a parcela e o link em `dados/ofertas.json`.
3. `python fotos.py` e `node build.mjs` (o build lista os botões sem link).
4. `git add -A && git commit -m "..." && git push`. O site atualiza em cerca de 1 minuto.

Para marcar como esgotado: `"esgotado": true` em `dados/ofertas.json`. Para tirar da campanha: remover o item de `dados/ofertas.json`.

O valor do link do Mercado Pago é parcela × 12 + R$ 100 de frete.
