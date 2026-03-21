import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NPS Agro Admin Console',
  description: 'Admin portal multi-tenant para NPS Agro'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
