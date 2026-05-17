import type { Metadata } from 'next';
import './globals.css';

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
      <body>{children}</body>
    </html>
  );
}
