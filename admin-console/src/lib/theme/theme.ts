import type { TenantBranding } from '@/lib/types';

export const defaultBranding: Required<TenantBranding> = {
  app_name: 'NPS Agro Admin',
  logo_url: '',
  primary_color: '#1168bd',
  secondary_color: '#0b4884',
  background_color: '#f6f8fb',
  text_color: '#1f2937'
};

export function resolveBranding(branding?: TenantBranding): Required<TenantBranding> {
  return {
    app_name: branding?.app_name || defaultBranding.app_name,
    logo_url: branding?.logo_url || defaultBranding.logo_url,
    primary_color: branding?.primary_color || defaultBranding.primary_color,
    secondary_color: branding?.secondary_color || defaultBranding.secondary_color,
    background_color: branding?.background_color || defaultBranding.background_color,
    text_color: branding?.text_color || defaultBranding.text_color
  };
}

export function applyBrandingToCssVars(branding: Required<TenantBranding>): void {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  root.style.setProperty('--color-primary', branding.primary_color);
  root.style.setProperty('--color-secondary', branding.secondary_color);
  root.style.setProperty('--color-bg', branding.background_color);
  root.style.setProperty('--color-text', branding.text_color);
}
