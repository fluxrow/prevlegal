export default function IsolamentoEmAndamentoPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '560px', background: 'var(--bg-card)', border: '1px solid rgba(255,87,87,0.18)', borderRadius: '16px', padding: '28px' }}>
        <p style={{ fontSize: '11px', fontWeight: '700', color: '#ff5757', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
          Acesso temporariamente restrito
        </p>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '24px', color: 'var(--text-primary)', margin: '0 0 10px' }}>
          Isolamento de dados em revisão
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, margin: '0 0 14px' }}>
          Identificamos um incidente crítico de segregação entre escritórios. Por segurança e compliance, o acesso do seu escritório foi pausado
          temporariamente enquanto corrigimos o isolamento de dados.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
          O escritório piloto continua ativo apenas para contenção operacional. Assim que o ambiente estiver seguro, o acesso será liberado novamente.
        </p>
      </div>
    </div>
  )
}
