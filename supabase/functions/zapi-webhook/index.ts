// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_ZAPI_WEBHOOK_URL = "https://app.prevlegal.com.br/api/webhooks/zapi";

function buildForwardUrl(requestUrl: string) {
  const incoming = new URL(requestUrl);
  const target = new URL(APP_ZAPI_WEBHOOK_URL);

  incoming.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value);
  });

  return target.toString();
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const forwardUrl = buildForwardUrl(request.url);

  try {
    const bodyText = request.method === "GET" ? undefined : await request.text();
    const contentType = request.headers.get("content-type") || "application/json";

    const response = await fetch(forwardUrl, {
      method: request.method,
      headers: {
        "content-type": contentType,
        "x-forwarded-by": "supabase-zapi-webhook",
      },
      body: bodyText,
    });

    const responseText = await response.text();

    return new Response(responseText, {
      status: response.status,
      headers: {
        ...corsHeaders,
        "content-type": response.headers.get("content-type") || "application/json",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({
        ok: false,
        provider: "zapi",
        error: message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "content-type": "application/json",
        },
      },
    );
  }
});
