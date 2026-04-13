-- PrevLegal
-- Patch manual para permitir lead sem CPF no primeiro contato
-- Data: 2026-04-13

begin;

alter table leads
  alter column cpf drop not null;

commit;
