-- =============================================
-- PREVLEGAL - Migration 033
-- WhatsApp warm-up guardrails + draft channels
-- =============================================

ALTER TABLE whatsapp_numbers
  DROP CONSTRAINT IF EXISTS whatsapp_numbers_twilio_required;

ALTER TABLE whatsapp_numbers
  DROP CONSTRAINT IF EXISTS whatsapp_numbers_zapi_required;

ALTER TABLE whatsapp_numbers
  ADD CONSTRAINT whatsapp_numbers_twilio_required
    CHECK (
      provider <> 'twilio' OR ativo = false OR (
        twilio_account_sid IS NOT NULL
        AND twilio_auth_token IS NOT NULL
        AND COALESCE(twilio_whatsapp_number, phone) IS NOT NULL
      )
    );

ALTER TABLE whatsapp_numbers
  ADD CONSTRAINT whatsapp_numbers_zapi_required
    CHECK (
      provider <> 'zapi' OR ativo = false OR (
        zapi_instance_id IS NOT NULL
        AND zapi_instance_token IS NOT NULL
      )
    );
