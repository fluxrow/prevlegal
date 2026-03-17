export type StatusContrato = 'ativo' | 'quitado' | 'cancelado' | 'inadimplente'
export type StatusParcela = 'pendente' | 'pago' | 'atrasado' | 'cancelado'

interface ParcelaStatusItem {
  status: string
}

interface GerarParcelasInput {
  contratoId: string
  valorTotal: number
  valorEntrada: number
  numParcelas: number
  dataBase?: Date
}

function toCents(value: number) {
  return Math.round((Number(value) || 0) * 100)
}

function fromCents(value: number) {
  return Number((value / 100).toFixed(2))
}

export function getDataHojeISO() {
  return new Date().toISOString().split('T')[0]
}

export function getDataISO(date: Date) {
  return date.toISOString().split('T')[0]
}

export function normalizarNumero(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function gerarParcelasContrato({
  contratoId,
  valorTotal,
  valorEntrada,
  numParcelas,
  dataBase = new Date(),
}: GerarParcelasInput) {
  if (numParcelas <= 0) return []

  const restanteCents = Math.max(0, toCents(valorTotal) - toCents(valorEntrada))
  const baseParcelaCents = Math.floor(restanteCents / numParcelas)
  const sobraCents = restanteCents - baseParcelaCents * numParcelas

  return Array.from({ length: numParcelas }, (_, index) => {
    const numero = index + 1
    const valorCents = baseParcelaCents + (index === numParcelas - 1 ? sobraCents : 0)
    const vencimento = new Date(dataBase)
    vencimento.setMonth(vencimento.getMonth() + numero)

    return {
      contrato_id: contratoId,
      numero,
      valor: fromCents(valorCents),
      data_vencimento: getDataISO(vencimento),
      status: 'pendente' as const,
    }
  })
}

export function calcularStatusContrato(parcelas: ParcelaStatusItem[], statusAtual?: string): StatusContrato {
  if (statusAtual === 'cancelado') return 'cancelado'
  if (parcelas.length === 0) return statusAtual === 'quitado' ? 'quitado' : 'ativo'

  const todasPagas = parcelas.every((parcela) => parcela.status === 'pago')
  if (todasPagas) return 'quitado'

  const temAtraso = parcelas.some((parcela) => parcela.status === 'atrasado')
  if (temAtraso) return 'inadimplente'

  return 'ativo'
}
