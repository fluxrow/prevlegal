# PrevLegal — Auth Branding Tasks

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]

Checklist para executar depois que `prevlegal.com.br` e `www.prevlegal.com.br` estiverem estabilizados na Vercel.

## Prioridade 1 — Infra de email

- [ ] Escolher provedor SMTP do produto
- [ ] Criar caixa/remetente operacional
  - sugestao: `no-reply@auth.prevlegal.com.br`
- [ ] Configurar DNS do remetente
  - [ ] SPF
  - [ ] DKIM
  - [ ] DMARC
- [ ] Configurar SMTP custom no Supabase Auth
- [ ] Validar envio real para Gmail e Outlook

## Prioridade 2 — Branding dos emails

- [ ] Trocar nome do remetente para `PrevLegal`
- [ ] Trocar assunto do reset para `Defina sua senha no PrevLegal`
- [ ] Traduzir e personalizar template de reset de senha
- [ ] Traduzir e personalizar template de convite/primeiro acesso
- [ ] Traduzir e personalizar template de magic link, se permanecer ativo
- [ ] Remover aparencia generica de `Supabase Auth`

## Prioridade 3 — Links e dominio

- [x] Confirmar `NEXT_PUBLIC_APP_URL=https://app.prevlegal.com.br`
- [ ] Garantir que emails auth apontem para a tela correta de definicao de senha
- [ ] Avaliar custom domain do Auth
  - sugestao: `auth.prevlegal.com.br`
- [ ] Se custom domain for contratado, mover links de auth para o host customizado

## Prioridade 4 — UX operacional

- [ ] Ajustar a copy do admin para deixar claro que o responsavel recebe um email de definicao de senha
- [ ] Criar texto curto para envio por WhatsApp apos `Enviar acesso do responsavel`
- [ ] Criar texto curto para reset de senha posterior
- [ ] Definir regra interna:
  - responsavel usa `Enviar acesso do responsavel` no primeiro acesso
  - `Resetar senha` so depois da conta ja existir

## Prioridade 5 — Validacao ponta a ponta

- [ ] Testar fluxo do responsavel:
  - [ ] email chega
  - [ ] link abre tela correta
  - [ ] senha salva
  - [ ] login funciona
- [ ] Testar fluxo de usuario convidado comum
- [ ] Testar email antigo/obsoleto sendo bloqueado
- [ ] Testar spam score basico em Gmail

## Estado confirmado em 2026-03-19

- `https://www.prevlegal.com.br` -> OK
- `https://prevlegal.com.br` -> redirect para `www`
- `https://app.prevlegal.com.br/login` -> OK
- `https://admin.prevlegal.com.br/admin/login` -> OK
- Proxima camada: branding do email e custom SMTP/Auth
