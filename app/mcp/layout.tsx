import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'MCP — Q Threats',
  description: 'Conectar Cursor al MCP de Q Threats (URL del backend y herramientas).',
};

export default function McpLayout({ children }: { children: ReactNode }) {
  return children;
}
