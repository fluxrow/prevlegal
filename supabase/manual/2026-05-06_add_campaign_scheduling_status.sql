do $$
begin
  alter type campanha_status add value if not exists 'agendada';
exception
  when duplicate_object then null;
end
$$;
