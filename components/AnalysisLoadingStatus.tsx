'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

const PHRASES = [
  'Pensando',
  'Analizando datos',
  'Analizando conexiones',
  'Mapeando relaciones',
  'Evaluando riesgos',
  'Construyendo el grafo',
] as const;

const TYPE_MS = 42;
const PAUSE_MS = 1600;
const DELETE_MS = 22;

export function AnalysisLoadingStatus() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const target = PHRASES[phraseIndex];

    if (!deleting) {
      if (text.length < target.length) {
        const t = window.setTimeout(
          () => setText(target.slice(0, text.length + 1)),
          TYPE_MS,
        );
        return () => window.clearTimeout(t);
      }
      const t = window.setTimeout(() => setDeleting(true), PAUSE_MS);
      return () => window.clearTimeout(t);
    }

    if (text.length > 0) {
      const t = window.setTimeout(() => setText(text.slice(0, -1)), DELETE_MS);
      return () => window.clearTimeout(t);
    }

    setDeleting(false);
    setPhraseIndex((i) => (i + 1) % PHRASES.length);
  }, [phraseIndex, text, deleting]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="absolute right-12 lg:right-16 top-1/2 -translate-y-1/2 z-20 pointer-events-none text-right max-w-sm"
      aria-live="polite"
      aria-busy="true"
    >
      <motion.div
        layout
        className="inline-block rounded-2xl px-5 py-4 glass-panel border border-white/10"
      >
        <p className="text-xl sm:text-2xl font-medium text-white/90 tracking-tight min-h-[2rem]">
          {text}
          <span
            className="inline-block w-[2px] h-[0.95em] ml-1 bg-teal-400/90 align-middle animate-pulse"
            aria-hidden
          />
        </p>
        <p className="mt-2 text-sm text-teal-400/55 font-normal">
          Q Threats · análisis en curso
        </p>
      </motion.div>
    </motion.div>
  );
}
