import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getTenantContext } from "@/lib/tenant-context";
import { createAdminSupabase } from "@/lib/internal-collaboration";

export async function GET() {
  const authSupabase = await createServerClient();
  const context = await getTenantContext(authSupabase);
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("whatsapp_numbers")
    .select(
      "id, label, provider, phone, purpose, ativo, is_default, zapi_connected_phone, twilio_whatsapp_number",
    )
    .eq("tenant_id", context.tenantId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    numbers: (data || []).map((number) => ({
      ...number,
      display_phone:
        number.phone ||
        number.zapi_connected_phone ||
        number.twilio_whatsapp_number ||
        null,
    })),
  });
}
