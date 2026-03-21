# NPS Agro Admin Console

Portal administrativo em Next.js (App Router) com:
- i18n (`pt-BR`, `en-US`, `es-ES`) via `next-intl`
- Auth JWT + RBAC multi-tenant
- Theming dinâmico por tenant via CSS variables
- Integração direta com backend (`NEXT_PUBLIC_API_BASE_URL`)

## Setup

1. Copiar `.env.example` para `.env.local`
2. Ajustar `NEXT_PUBLIC_API_BASE_URL` se necessário
3. Instalar dependências:
   - `npm install`
4. Rodar em desenvolvimento:
   - `npm run dev`

## Rotas principais

- `/{locale}/login`
- `/{locale}/dashboard`
- `/{locale}/campaigns`
- `/{locale}/questionnaires`
- `/{locale}/reports`
- `/{locale}/interviews`
- `/{locale}/tenants`
- `/{locale}/users`
- `/{locale}/settings/branding`
