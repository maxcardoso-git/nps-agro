'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils/cn';

const items = [
  { key: 'dashboard', href: '/dashboard' },
  { key: 'campaignAnalytics', href: '/campaigns' },
  { key: 'segmentAnalytics', href: '/segments' },
  { key: 'accountAnalytics', href: '/accounts' },
  { key: 'interviewExplorer', href: '/interviews' }
];

export function Sidebar() {
  const t = useTranslations('common.menu');
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-slate-200 bg-white p-3">
      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const href = `/${locale}${item.href}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={item.key}
              href={href as never}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition',
                active ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-100'
              )}
            >
              {t(item.key)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
