import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant-context'
import { createAdminSupabase } from '@/lib/internal-collaboration'
import {
  dispatchRecontactCandidate,
  isRecontactFoundationMissing,
  listRecontactCandidates,
  scanRecontactCandidatesForTenant,
} from '@/lib/recontact-automation-engine'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || 'Erro desconhecido')
}

export async function GET(request: NextRequest) {
  const authSupabase = await createServerClient()
  const context = await getTenantContext(authSupabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!context.tenantId) return NextResponse.json({ candidates: [], foundationReady: false })

  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') || 50), 1), 200)

  try {
    const admin = createAdminSupabase()
    const candidates = await listRecontactCandidates(admin, context.tenantId, limit)
    return NextResponse.json({ candidates, foundationReady: true })
  } catch (error) {
    if (isRecontactFoundationMissing(error)) {
      return NextResponse.json({
        candidates: [],
        foundationReady: false,
        error: 'A base do recontato ainda não foi aplicada no banco.',
      })
    }

    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authSupabase = await createServerClient()
  const context = await getTenantContext(authSupabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!context.tenantId) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 400 })

  try {
    const body = await request.json().catch(() => null)
    const action = String(body?.action || '')
    const admin = createAdminSupabase()

    if (action === 'scan') {
      const result = await scanRecontactCandidatesForTenant(admin, context.tenantId)
      return NextResponse.json({ ok: true, result })
    }

    if (action === 'dispatch') {
      const candidateId = String(body?.candidateId || '').trim()
      if (!candidateId) {
        return NextResponse.json({ error: 'candidateId obrigatório' }, { status: 400 })
      }

      const result = await dispatchRecontactCandidate(admin, context.tenantId, candidateId)
      return NextResponse.json({ ok: true, result })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (error) {
    if (isRecontactFoundationMissing(error)) {
      return NextResponse.json(
        { error: 'A base do recontato ainda não foi aplicada no banco.', code: 'foundation_missing' },
        { status: 409 },
      )
    }

    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
