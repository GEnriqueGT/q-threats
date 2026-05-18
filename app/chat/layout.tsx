import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Chat — Q Threats',
  description: 'Asistente con datos del proyecto vía MiniMax.',
};

export default function ChatLayout({ children }: { children: ReactNode }) {
  return children;
}
