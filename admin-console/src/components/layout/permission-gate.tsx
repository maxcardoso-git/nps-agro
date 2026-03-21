'use client';

import { useTranslations } from 'next-intl';
import { usePermission } from '@/hooks/use-permission';

interface PermissionGateProps {
  permission: string;
  children: React.ReactNode;
}

export function PermissionGate({ permission, children }: PermissionGateProps) {
  const t = useTranslations('errors');
  const { can } = usePermission();

  if (!can(permission)) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {t('forbidden')}
      </div>
    );
  }

  return <>{children}</>;
}
