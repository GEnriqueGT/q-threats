'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NodeDetail } from '@/lib/types';

interface NodeViewProps {
  nodes: NodeDetail[];
  onBack: () => void;
}

export function NodeView({ nodes, onBack }: NodeViewProps) {
  const [activeNode, setActiveNode] = useState<string | null>(nodes[1]?.id || null);

  const activeNodeData = nodes.find((n) => n.id === activeNode);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-12">
      <div className="absolute top-24 left-1/2 -translate-x-1/2 pointer-events-auto">
        <h2 className="text-3xl font-bold tracking-wider text-white">Analisis</h2>
      </div>

      <div className="relative w-full max-w-5xl h-[60vh] flex items-center justify-center mt-12 pointer-events-auto">
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))' }}
        >
          <line
            x1="25%"
            y1="50%"
            x2="50%"
            y2="50%"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="3"
            strokeDasharray="5,5"
          />
          <line
            x1="50%"
            y1="50%"
            x2="75%"
            y2="50%"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="3"
            strokeDasharray="5,5"
          />
        </svg>

        <div className="flex items-center justify-center gap-16 w-full absolute inset-0 z-10">
          {nodes.map((node) => {
            const isActive = activeNode === node.id;
            return (
              <motion.div
                key={node.id}
                drag
                dragConstraints={{ left: -50, right: 50, top: -50, bottom: 50 }}
                onDragStart={() => setActiveNode(node.id)}
                onClick={() => setActiveNode(node.id)}
                className={`relative cursor-grab active:cursor-grabbing rounded-xl overflow-hidden glass transition-all duration-300 ${isActive ? 'w-48 h-48 border-red-500 border-2 z-20 shadow-[0_0_30px_rgba(239,68,68,0.4)]' : 'w-32 h-32 border-white/20'}`}
                whileHover={{ scale: 1.05 }}
              >
                <img
                  src={node.imageUrl}
                  alt={node.title}
                  className="w-full h-full object-cover object-center"
                />
              </motion.div>
            );
          })}
        </div>
      </div>

      {activeNodeData && (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeNodeData.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pointer-events-auto z-20 mt-8 max-w-2xl text-center flex flex-col gap-6"
          >
            <p className="text-xl leading-relaxed text-white/90">{activeNodeData.description}</p>

            {activeNodeData.risks.length > 0 && (
              <div className="text-left w-full mt-4">
                <h4 className="text-xl font-semibold mb-3">
                  Esta compra presenta riesgos debido a:
                </h4>
                <ul className="list-disc pl-5 flex flex-col gap-3">
                  {activeNodeData.risks.map((risk, idx) => (
                    <li key={idx} className="text-lg text-white/80">
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {activeNodeData.sources && activeNodeData.sources.length > 0 && (
              <div className="flex gap-4 items-center justify-center mt-4">
                <span className="font-semibold text-white/70">Fuentes:</span>
                {activeNodeData.sources.map((source, i) => (
                  <button
                    key={i}
                    className="relative px-4 py-2 glass rounded-lg text-sm text-white/90 hover:bg-white/20 transition-all group overflow-hidden"
                  >
                    <span className="relative z-10">{source}</span>
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-8">
              <button
                onClick={onBack}
                className="px-6 py-2 glass rounded-full hover:bg-white/10 transition"
              >
                Volver
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
