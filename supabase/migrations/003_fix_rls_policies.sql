-- =============================================
-- PREVLEGAL — Migration 003
-- Adiciona políticas de RLS faltantes para escritas
-- =============================================

CREATE POLICY "usuarios autenticados escrevem listas" ON listas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "usuarios autenticados escrevem campanhas" ON campanhas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "usuarios autenticados escrevem templates" ON templates FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "usuarios autenticados escrevem disparos" ON disparos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "usuarios autenticados escrevem agentes" ON agentes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "usuarios autenticados escrevem configuracoes" ON configuracoes FOR ALL USING (auth.role() = 'authenticated');
