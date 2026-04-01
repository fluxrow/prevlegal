import type { Metadata } from 'next'

export async function generateMetadata(
  { params }: { params: Promise<{ token: string }> },
): Promise<Metadata> {
  const { token } = await params

  return {
    title: 'Portal do Cliente',
    manifest: `/api/portal/manifest/${token}`,
    appleWebApp: {
      capable: true,
      title: 'Portal do Cliente',
      statusBarStyle: 'default',
    },
  }
}

export default function PortalTokenLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
