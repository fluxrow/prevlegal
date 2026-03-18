import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #07080d 0%, #0d1117 50%, #111827 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50px',
            left: '100px',
            width: '400px',
            height: '300px',
            background: 'radial-gradient(ellipse, rgba(67,97,238,0.3) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '80px',
            right: '80px',
            width: '300px',
            height: '200px',
            background: 'radial-gradient(ellipse, rgba(0,196,140,0.2) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            background: 'rgba(67,97,238,0.15)',
            border: '1px solid rgba(67,97,238,0.3)',
            borderRadius: '100px',
            marginBottom: '28px',
          }}
        >
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00c48c' }} />
          <span style={{ fontSize: '16px', color: '#a5b4fc', fontWeight: '600' }}>
            Plataforma para operações previdenciárias
          </span>
        </div>
        <div
          style={{
            fontSize: '72px',
            fontWeight: '800',
            color: '#ffffff',
            textAlign: 'center',
            lineHeight: '1.05',
            letterSpacing: '-2px',
            marginBottom: '20px',
            maxWidth: '900px',
          }}
        >
          Do lead importado ao <span style={{ color: '#a5b4fc' }}>contrato fechado</span>
        </div>
        <div
          style={{
            fontSize: '24px',
            color: '#7a8499',
            textAlign: 'center',
            maxWidth: '700px',
            fontWeight: '300',
          }}
        >
          Qualificação por IA · WhatsApp automático · Compliance OAB
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '28px', fontWeight: '800', color: '#fff' }}>Prev</span>
          <span style={{ fontSize: '28px', fontWeight: '800', color: '#a5b4fc' }}>Legal</span>
          <span style={{ fontSize: '14px', color: '#3d4558', marginLeft: '8px' }}>
            by Fluxrow · prevlegal.com.br
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
