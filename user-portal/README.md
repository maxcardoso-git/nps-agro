# User Portal (Analytics)

Frontend de consumo analítico do NPS Agro.

## Stack
- Next.js (App Router) + TypeScript
- TailwindCSS
- React Query
- React Hook Form + Zod
- Recharts
- next-intl

## Ambiente
Crie um `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://72.61.52.70:3310
```

## Scripts
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

## Rotas
- `/{locale}/login`
- `/{locale}/dashboard`
- `/{locale}/campaigns/{id}`
- `/{locale}/interviews/{id}?campaignId={campaignId}`

## Notas
- Sessão JWT persistida via cookie + localStorage.
- RBAC frontend habilita acesso para: `admin_master`, `platform_admin`, `tenant_admin`, `campaign_manager`, `analyst`.
- Theming por tenant via `tenant.settings_json.branding` aplicado com CSS variables.
