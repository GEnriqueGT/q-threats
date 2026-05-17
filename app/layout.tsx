import type { Metadata } from 'next';
import './globals.css';
import { MainNav } from '@/components/MainNav';

export const metadata: Metadata = {
  title: 'Q Threats',
  description: 'Poniendo las Amenazas al ojo publico',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="relative">
        <MainNav />
        {children}
      </body>
    </html>
  );
}
