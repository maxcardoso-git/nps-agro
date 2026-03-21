import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NPS Agro Analytics Portal',
  description: 'Portal analítico para consumo de resultados e insights de NPS'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
