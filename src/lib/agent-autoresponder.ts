export async function triggerAgentAutoresponder(mensagemId: string) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim()
  const internalToken = (process.env.ADMIN_FLUXROW_TOKEN || '').trim()
  const timeoutMs = Number(process.env.AGENT_AUTORESPONDER_TIMEOUT_MS || 120000)

  if (!appUrl) {
    return {
      ok: false,
      status: 0,
      error: 'NEXT_PUBLIC_APP_URL não configurado',
    }
  }

  try {
    const response = await fetch(`${appUrl}/api/agente/responder`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(internalToken ? { authorization: `Bearer ${internalToken}` } : {}),
      },
      body: JSON.stringify({ mensagem_id: mensagemId }),
      signal: AbortSignal.timeout(Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 120000),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      return {
        ok: false,
        status: response.status,
        error: body || `Falha ao acionar agente (${response.status})`,
      }
    }

    return {
      ok: true,
      status: response.status,
    }
  } catch (error: any) {
    return {
      ok: false,
      status: 0,
      error: error?.message || 'Falha ao acionar agente',
    }
  }
}
