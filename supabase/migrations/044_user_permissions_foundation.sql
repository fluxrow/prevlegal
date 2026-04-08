alter table usuarios
  add column if not exists permissions jsonb;

comment on column usuarios.permissions is
  'Permissões granulares por usuário. Quando null, o sistema usa o preset padrão da role.';
