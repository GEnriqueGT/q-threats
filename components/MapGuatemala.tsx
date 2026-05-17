'use client';

import type { RefObject } from 'react';
import Image from 'next/image';
import { getDepartmentSlug } from '@/lib/departmentManifest';

interface MapGuatemalaProps {
  onClick: () => void;
  department?: string;
  mapStageRef?: RefObject<HTMLDivElement | null>;
}

const STAGE_SIZE = 'min(calc(100vh - 11rem), 44vw, 42rem)';
const DEPT_RATIO = 0.54;

export function MapGuatemala({
  onClick,
  department = 'Guatemala',
  mapStageRef,
}: MapGuatemalaProps) {
  const slug = getDepartmentSlug(department);
  const src = `/departments/${slug}.svg`;

  return (
    <div
      className="relative flex flex-col items-center justify-center cursor-pointer group w-full h-full min-h-0 z-10"
      onClick={onClick}
    >
      <div
        ref={mapStageRef}
        className="relative flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.02]"
        style={{ width: STAGE_SIZE, height: STAGE_SIZE, aspectRatio: '1' }}
      >
        <div
          className="relative z-10 flex items-center justify-center"
          style={{ width: `${DEPT_RATIO * 100}%`, height: `${DEPT_RATIO * 100}%` }}
        >
          <Image
            key={slug}
            src={src}
            alt={`Departamento de ${department}`}
            width={400}
            height={400}
            className="w-full h-full object-contain"
            priority
          />
        </div>
      </div>
      <p className="mt-5 text-xl font-medium tracking-wide text-white/90 whitespace-nowrap shrink-0">
        Departamento de {department}
      </p>
    </div>
  );
}


