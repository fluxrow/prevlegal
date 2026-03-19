# PrevLegal Site

Projeto estático dedicado para a LP pública do PrevLegal.

## Objetivo

- servir `www.prevlegal.com.br`
- manter a LP isolada do app principal
- deixar `app.prevlegal.com.br` e `admin.prevlegal.com.br` no projeto operacional

## Arquivos principais

- `index.html` -> LP principal
- `demo.html` -> demo embedado pela LP
- `vercel.json` -> configuração do projeto estático na Vercel

## Deploy recomendado

1. Criar um projeto Vercel novo, por exemplo `prevlegal-site`
2. Conectar este mesmo repositório
3. Definir `Root Directory` como `site`
4. Adicionar `www.prevlegal.com.br` ao projeto `prevlegal-site`
5. Configurar `prevlegal.com.br` para redirect para `https://www.prevlegal.com.br`

## Observação

Os CTAs da LP devem continuar apontando para `https://app.prevlegal.com.br/login`.
