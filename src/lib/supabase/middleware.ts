import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_LAST_ACTIVE_COOKIE,
  APP_LAST_ACTIVE_COOKIE,
  APP_IDLE_MINUTES,
  ADMIN_IDLE_MINUTES,
  getTimestampNow,
  isTimestampExpired,
} from "@/lib/session-config";
import { canBypassContainmentForBootstrap, isBlockedByTenantContainment } from "@/lib/tenant-containment";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(
              name,
              value,
              options as Parameters<typeof supabaseResponse.cookies.set>[2],
            ),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname
  const publicPaths = ["/login", "/reauth", "/admin/login", "/admin/reauth", "/portal", "/auth/", "/lp.html", "/isolamento-em-andamento"];
  const publicApiPrefixes = [
    '/api/admin/auth',
    '/api/admin/reauth',
    '/api/usuarios/aceitar-convite',
    '/api/usuarios/convite',
    '/api/webhooks/',
    '/api/whatsapp/verificar',
    '/api/portal/',
  ]
  const isPublic = publicPaths.some((p) =>
    pathname.startsWith(p),
  ) || publicApiPrefixes.some((p) => pathname.startsWith(p));
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/')
  const isAdminApiRoute = pathname.startsWith('/api/admin/')
    && pathname !== '/api/admin/auth'
    && pathname !== '/api/admin/reauth'
  const isApiRoute = pathname.startsWith('/api/')
  const allowedBlockedApiPrefixes = [
    '/api/admin/',
    '/api/webhooks/',
    '/api/usuarios/aceitar-convite',
    '/api/usuarios/convite',
    '/api/session/logout',
    '/api/session/touch',
    '/api/session/reauth',
  ]

  if ((isAdminRoute && pathname !== '/admin/login' && pathname !== '/admin/reauth') || isAdminApiRoute) {
    const adminToken = request.cookies.get('admin_token')?.value
    const adminLastActive = request.cookies.get(ADMIN_LAST_ACTIVE_COOKIE)?.value

    if (!adminToken || isTimestampExpired(adminLastActive, ADMIN_IDLE_MINUTES * 60 * 1000)) {
      if (isAdminApiRoute) {
        const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        response.cookies.delete(ADMIN_LAST_ACTIVE_COOKIE)
        return response
      }

      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      const response = NextResponse.redirect(url)
      response.cookies.delete(ADMIN_LAST_ACTIVE_COOKIE)
      return response
    }

    supabaseResponse.cookies.set(ADMIN_LAST_ACTIVE_COOKIE, getTimestampNow(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ADMIN_IDLE_MINUTES * 60,
    })

    return supabaseResponse
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && !isPublic) {
    const bootstrapBypass = isBlockedByTenantContainment(user.email)
      ? await canBypassContainmentForBootstrap(supabase, user.id)
      : false

    if (isBlockedByTenantContainment(user.email) && !bootstrapBypass) {
      if (isApiRoute) {
        const canBypass = allowedBlockedApiPrefixes.some((prefix) => pathname.startsWith(prefix))
        if (!canBypass) {
          return NextResponse.json(
            { error: 'Acesso temporariamente restrito enquanto o isolamento entre escritorios e corrigido.' },
            { status: 423 },
          )
        }
      } else {
        const url = request.nextUrl.clone()
        url.pathname = '/isolamento-em-andamento'
        return NextResponse.redirect(url)
      }
    }

    const lastActive = request.cookies.get(APP_LAST_ACTIVE_COOKIE)?.value
    if (isTimestampExpired(lastActive, APP_IDLE_MINUTES * 60 * 1000)) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      const response = NextResponse.redirect(url)
      response.cookies.delete(APP_LAST_ACTIVE_COOKIE)
      return response
    }

    supabaseResponse.cookies.set(APP_LAST_ACTIVE_COOKIE, getTimestampNow(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: APP_IDLE_MINUTES * 60,
    })
  }

  return supabaseResponse;
}
