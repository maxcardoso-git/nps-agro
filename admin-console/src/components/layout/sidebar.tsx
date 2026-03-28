'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils/cn';
import { usePermission } from '@/hooks/use-permission';

interface MenuItem {
  key: string;
  href: string;
  permissions: string[];
}

const items: MenuItem[] = [
  { key: 'dashboard', href: '/dashboard', permissions: [] },
  { key: 'campaigns', href: '/campaigns', permissions: ['campaign.read'] },
  { key: 'questionnaires', href: '/questionnaires', permissions: ['questionnaire.read'] },
  { key: 'reports', href: '/reports', permissions: ['report.read'] },
  { key: 'interviews', href: '/interviews', permissions: ['interview.execute', 'campaign.read'] },
  { key: 'accounts', href: '/accounts', permissions: ['campaign.read'] },
  { key: 'tenants', href: '/tenants', permissions: ['tenant.read'] },
  { key: 'users', href: '/users', permissions: ['user.read'] },
  { key: 'audioBatch', href: '/audio-batch', permissions: ['campaign.update'] },
  { key: 'qualityReview', href: '/quality-review', permissions: ['report.read'] },
  { key: 'llmResources', href: '/llm-resources', permissions: ['llm_resource.read'] },
  { key: 'branding', href: '/settings/branding', permissions: ['branding.update', 'tenant.read'] }
];

export function Sidebar() {
  const t = useTranslations('common.menu');
  const locale = useLocale();
  const pathname = usePathname();
  const { canAny } = usePermission();

  return (
    <aside className="w-64 border-r border-slate-200 bg-white p-3">
      <nav className="flex flex-col gap-1">
        {items
          .filter((item) => canAny(item.permissions))
          .map((item) => {
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
