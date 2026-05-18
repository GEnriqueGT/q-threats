'use client';

import type { RefObject } from 'react';
import Image from 'next/image';

interface MapGuatemalaProps {
  mapStageRef?: RefObject<HTMLDivElement | null>;
}

const STAGE_SIZE = 'min(calc(100vh - 11rem), 34vw, 32rem)';
const MAP_RATIO = 0.78;

export function MapGuatemala({ mapStageRef }: MapGuatemalaProps) {
  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full min-h-0 z-10 pointer-events-none">
      <div
        ref={mapStageRef}
        className="relative flex items-center justify-center"
        style={{ width: STAGE_SIZE, height: STAGE_SIZE, aspectRatio: '1' }}
      >
        <div
          className="relative z-10 flex items-center justify-center"
          style={{ width: `${MAP_RATIO * 100}%`, height: `${MAP_RATIO * 100}%` }}
        >
          <Image
            src="/guatemala-country.svg"
            alt="Mapa de Guatemala"
            width={400}
            height={400}
            className="w-full h-full object-contain"
            priority
          />
        </div>
      </div>
      <p className="mt-5 text-xl font-medium tracking-wide text-white/90 whitespace-nowrap shrink-0">
        Guatemala
      </p>
    </div>
  );
}
