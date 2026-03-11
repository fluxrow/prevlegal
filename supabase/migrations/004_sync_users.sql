-- =============================================
-- PREVLEGAL — Migration 004
-- Sincroniza usuários do auth.users com public.usuarios
-- =============================================

-- 1. Função que roda no trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.usuarios (auth_id, nome, email, role)
  VALUES (new.id, coalesce(new.raw_user_meta_data->>'full_name', substring(new.email from '(.*)@')), new.email, 'admin');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Cria o trigger em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Inserção manual para usuários já existentes
INSERT INTO public.usuarios (auth_id, nome, email, role)
SELECT id, coalesce(raw_user_meta_data->>'full_name', substring(email from '(.*)@')), email, 'admin'
FROM auth.users
WHERE id NOT IN (SELECT auth_id FROM public.usuarios);
