# Site das lives da Moderninha Móveis

Site estático publicado em https://live.moderninhamoveis.com.br pelo GitHub Pages (pasta `docs/`).

- `dados/produtos.json`: cadastro dos produtos (fotos, descrição, características, medidas), pelo código do ERP.
- `dados/lives/AAAA-MM-DD.json`: produtos, parcelas e links do Mercado Pago de cada live. A mais recente vira `/live/`.
- `fotos.py`: converte as fotos dos produtos para WebP em `docs/img/`.
- `build.mjs`: gera as páginas em `docs/`.

## Rotina de cada live

1. Cadastrar em `dados/produtos.json` os produtos novos (os já cadastrados são reaproveitados).
2. Criar `dados/lives/AAAA-MM-DD.json` com os códigos, as parcelas e os links.
3. `python fotos.py` e `node build.mjs` (o build lista os botões sem link).
4. `git add -A && git commit -m "Live AAAA-MM-DD" && git push`. O site atualiza em cerca de 1 minuto.

Para marcar um produto como esgotado: `"esgotado": true` no JSON da live, rodar o build e publicar.

O valor do link do Mercado Pago é parcela × 12 + R$ 100 de frete.
