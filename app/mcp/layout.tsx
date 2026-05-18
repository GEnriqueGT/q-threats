import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'MCP — Q Threats',
  description: 'Model Context Protocol y cómo conectarlo en Cursor.',
};

export default function McpLayout({ children }: { children: ReactNode }) {
  return children;
}
