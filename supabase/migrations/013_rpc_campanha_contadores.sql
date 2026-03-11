-- RPC para incrementar total_entregues
CREATE OR REPLACE FUNCTION increment_campanha_entregues(p_campanha_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE campanhas 
  SET total_entregues = COALESCE(total_entregues, 0) + 1
  WHERE id = p_campanha_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC para incrementar total_lidos
CREATE OR REPLACE FUNCTION increment_campanha_lidos(p_campanha_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE campanhas 
  SET total_lidos = COALESCE(total_lidos, 0) + 1
  WHERE id = p_campanha_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC para incrementar total_falhos
CREATE OR REPLACE FUNCTION increment_campanha_falhos(p_campanha_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE campanhas 
  SET total_falhos = COALESCE(total_falhos, 0) + 1
  WHERE id = p_campanha_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
