-- Permitir cadastro manual de lead sem CPF no primeiro contato
alter table leads
  alter column cpf drop not null;
