CREATE OR REPLACE FUNCTION increment_campanha_respondidos(p_campanha_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE campanhas 
  SET total_respondidos = COALESCE(total_respondidos, 0) + 1
  WHERE id = p_campanha_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
