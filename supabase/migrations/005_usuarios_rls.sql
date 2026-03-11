-- =============================================
-- PREVLEGAL — Migration 005
-- Libera leitura da tabela usuarios para usuários autenticados
-- =============================================

CREATE POLICY "usuarios autenticados veem usuarios" ON usuarios FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "usuarios alteram o proprio perfil" ON usuarios FOR UPDATE USING (auth_id = auth.uid());
