# NPS Agro Analytics Portal

Portal frontend de consumo analítico para usuários de negócio.

## Stack

- Next.js (App Router)
- TailwindCSS
- React Query
- Recharts
- next-intl
- JWT (reuso do backend)

## Funcionalidades MVP

- Login com JWT (`/auth/login`)
- Dashboard executivo com KPIs, tendência, sentimento, tópicos e alertas
- Campaign Analytics com comparação entre campanhas
- Campaign Detail com filtros e drill-down
- Interview Explorer com filtros e busca textual
- Interview Detail
- Multi-idioma (`pt-BR`, `en-US`, `es-ES`)
- Branding por tenant via `settings_json.branding`

## Setup

1. Copiar `.env.example` para `.env.local`
2. Ajustar `NEXT_PUBLIC_API_BASE_URL` se necessário
3. Instalar dependências:
   - `npm install`
4. Rodar:
   - `npm run dev`

## Rotas principais

- `/{locale}/login`
- `/{locale}/dashboard`
- `/{locale}/campaigns`
- `/{locale}/campaigns/{campaignId}`
- `/{locale}/interviews`
- `/{locale}/interviews/{interviewId}?campaignId=...`
