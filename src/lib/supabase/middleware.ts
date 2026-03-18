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
  const publicPaths = ["/login", "/reauth", "/admin/login", "/admin/reauth", "/portal", "/auth/", "/api/", "/lp.html"];
  const isPublic = publicPaths.some((p) =>
    pathname.startsWith(p),
  );
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/')

  if (isAdminRoute && pathname !== '/admin/login' && pathname !== '/admin/reauth') {
    const adminToken = request.cookies.get('admin_token')?.value
    const adminLastActive = request.cookies.get(ADMIN_LAST_ACTIVE_COOKIE)?.value

    if (!adminToken || isTimestampExpired(adminLastActive, ADMIN_IDLE_MINUTES * 60 * 1000)) {
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
