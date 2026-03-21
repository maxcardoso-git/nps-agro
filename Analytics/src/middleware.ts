import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { SESSION_COOKIE_NAME } from '@/lib/auth/constants';

const intlMiddleware = createMiddleware(routing);
const PUBLIC_ROUTES = new Set(['/login']);

function extractLocalizedRoute(pathname: string): { locale: string | null; route: string } {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) {
    return { locale: null, route: '/' };
  }

  const locale = parts[0];
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    return { locale: null, route: pathname };
  }

  const routePath = `/${parts.slice(1).join('/')}`;
  return { locale, route: routePath === '/' ? '/' : routePath };
}

export default function middleware(request: NextRequest) {
  const intlResponse = intlMiddleware(request);
  const { locale, route } = extractLocalizedRoute(request.nextUrl.pathname);

  if (!locale) {
    return intlResponse;
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isPublic = PUBLIC_ROUTES.has(route);

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
