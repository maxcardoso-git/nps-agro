import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from '@/lib/i18n/routing';
import { SESSION_COOKIE_NAME } from '@/lib/auth/constants';

const intlMiddleware = createMiddleware(routing);
const publicRoutes = new Set(['/login']);

function localizedPath(pathname: string): { locale: string | null; route: string } {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) {
    return { locale: null, route: '/' };
  }

  const locale = parts[0];
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    return { locale: null, route: pathname };
  }

  const route = `/${parts.slice(1).join('/')}`;
  return { locale, route: route === '/' ? '/' : route };
}

export default function middleware(request: NextRequest) {
  const intlResponse = intlMiddleware(request);
  const { locale, route } = localizedPath(request.nextUrl.pathname);

  if (!locale) {
    return intlResponse;
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isPublic = publicRoutes.has(route);

  if (!token && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return NextResponse.redirect(url);
  }

  if (token && isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    return NextResponse.redirect(url);
  }

  return intlResponse;
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)']
};
