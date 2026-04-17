const DEFAULT_TIMEOUT_MS = 120000
const MAX_RETRY_ATTEMPTS = 4

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function triggerAgentAutoresponder(mensagemId: string) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim()
  const internalToken = (process.env.ADMIN_FLUXROW_TOKEN || '').trim()
  const timeoutMs = Number(process.env.AGENT_AUTORESPONDER_TIMEOUT_MS || DEFAULT_TIMEOUT_MS)

  if (!appUrl) {
    return {
      ok: false,
      status: 0,
      error: 'NEXT_PUBLIC_APP_URL não configurado',
    }
  }

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(`${appUrl}/api/agente/responder`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(internalToken ? { authorization: `Bearer ${internalToken}` } : {}),
        },
        body: JSON.stringify({ mensagem_id: mensagemId }),
        signal: AbortSignal.timeout(Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS),
      })

      const body = await response.text().catch(() => '')
      let payload: any = null
      try {
        payload = body ? JSON.parse(body) : null
      } catch {
        payload = null
      }

      if (response.status === 202) {
        if (payload?.reason === 'stale_message') {
          return {
            ok: true,
            status: response.status,
            payload,
          }
        }

        if (payload?.retryable && attempt < MAX_RETRY_ATTEMPTS) {
          const retryAfterMs = Math.max(1000, Number(payload?.retry_after_ms || 1000))
          await sleep(retryAfterMs)
          continue
        }
      }

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          error: payload?.error || body || `Falha ao acionar agente (${response.status})`,
          payload,
        }
      }

      return {
        ok: true,
        status: response.status,
        payload,
      }
    } catch (error: any) {
      if (attempt < MAX_RETRY_ATTEMPTS) {
        await sleep(1000 * attempt)
        continue
      }

      return {
        ok: false,
        status: 0,
        error: error?.message || 'Falha ao acionar agente',
      }
    }
  }

  return {
    ok: false,
    status: 0,
    error: 'Falha ao acionar agente após múltiplas tentativas',
  }
}
