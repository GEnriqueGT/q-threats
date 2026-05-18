'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { DOCS_SITE_URL } from '@/lib/docsSiteUrl';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(id);
  }, [messages, loading, error]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const nextHistory: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(nextHistory);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextHistory }),
      });
      const json = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !json.reply) {
        throw new Error(json.error || `Error ${res.status}`);
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: json.reply! }]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al enviar el mensaje.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden bg-gradient-to-br from-[#030603] via-[#0a1512] to-[#173330] font-sans text-white">
      <div className="mx-auto flex min-h-0 w-full max-w-[90rem] flex-1 flex-col px-12 pb-[calc(env(safe-area-inset-bottom,0px)+4.75rem)] pt-28 lg:px-16 lg:pb-[calc(env(safe-area-inset-bottom,0px)+5rem)]">
        <header className="mb-4 shrink-0">
          <h1 className="text-2xl font-bold tracking-wide text-white sm:text-3xl">Chat</h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-white/65">
            Asistente basado en MiniMax con contexto del proyecto (amenazas demo y grafo Neo4j o datos
            consolidados). Define <code className="rounded bg-black/35 px-1.5 py-0.5 text-sm">MINIMAX_API_KEY</code>{' '}
            en <code className="rounded bg-black/35 px-1.5 py-0.5 text-sm">.env.local</code>.
          </p>
        </header>

        <div className="glass-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10">
          <div
            ref={scrollContainerRef}
            className="min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 md:px-6 md:py-6"
          >
            {messages.length === 0 && (
              <p className="text-center text-white/50">
                Escribe una pregunta sobre amenazas, nodos o relaciones del contexto cargado en el servidor.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={[
                    'max-w-[min(100%,42rem)] rounded-2xl px-4 py-3 text-base leading-relaxed',
                    m.role === 'user'
                      ? 'bg-teal-600/35 text-white border border-teal-400/25'
                      : 'bg-black/30 text-white/90 border border-white/10',
                  ].join(' ')}
                >
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/45">
                    {m.role === 'user' ? 'Tú' : 'MiniMax'}
                  </span>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))}
            {loading && (
              <p className="text-center text-sm text-teal-300/90">Generando respuesta…</p>
            )}
            {error && (
              <p className="rounded-xl border border-red-400/30 bg-red-950/40 px-4 py-3 text-center text-sm text-red-200">
                {error}
              </p>
            )}
          </div>

          <div className="shrink-0 border-t border-white/10 bg-black/20 p-4 md:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label htmlFor="chat-input" className="sr-only">
                Mensaje
              </label>
              <textarea
                id="chat-input"
                rows={2}
                value={input}
                disabled={loading}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Pregunta sobre el grafo o las amenazas…"
                className="min-h-[3rem] flex-1 resize-y rounded-xl border border-white/18 bg-black/35 px-4 py-3 text-base text-white outline-none ring-teal-500/35 backdrop-blur-md placeholder:text-white/40 focus:border-teal-400/40 focus:ring-2 disabled:opacity-50"
              />
              <button
                type="button"
                disabled={loading || !input.trim()}
                onClick={() => void send()}
                className="shrink-0 rounded-xl bg-teal-500/85 px-6 py-3 text-base font-semibold text-[#061510] transition hover:bg-teal-400 disabled:pointer-events-none disabled:opacity-40"
              >
                Enviar
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-white/45">
              Enter envía · Shift+Enter nueva línea ·{' '}
              <a
                href={DOCS_SITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-300/90 underline-offset-2 hover:underline"
              >
                Docs
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
