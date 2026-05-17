'use client';

import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (dept: string) => void;
  departments: string[];
}

export function DepartmentModal({
  isOpen,
  onClose,
  onSelect,
  departments,
}: DepartmentModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto p-4 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[80vh] flex flex-col glass-panel rounded-3xl overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.5)] border border-white/20 relative"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
              <h2 className="text-2xl font-semibold text-white tracking-wide">
                Seleccionar Departamento
              </h2>
              <button
                onClick={onClose}
                className="p-2 glass rounded-full hover:bg-white/20 transition-colors"
              >
                <X size={20} className="text-white" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-3">
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => {
                    onSelect(dept);
                    onClose();
                  }}
                  className="px-4 py-3 glass rounded-xl text-left text-white/90 font-medium hover:bg-white/10 hover:scale-105 transition-all text-sm"
                >
                  {dept}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
