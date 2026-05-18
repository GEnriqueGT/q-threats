import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { threats } from '@/lib/data';
import { matchesThreatQuery } from '@/lib/mcp/threatSearch';
import type { ThreatLevel } from '@/lib/types';

const LEVELS: ThreatLevel[] = ['high', 'medium', 'low', 'possible'];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const level = searchParams.get('level');
  const limitRaw = searchParams.get('limit');

  let list = [...threats];

  const levelOk = Boolean(level && LEVELS.includes(level as ThreatLevel));
  if (levelOk) {
    list = list.filter((t) => t.level === level as ThreatLevel);
  }

  if (q) {
    list = list.filter((t) => matchesThreatQuery(t, q));
  }

  const hasFilter = Boolean(q) || levelOk;
  if (hasFilter) {
    list.sort((a, b) => a.id.localeCompare(b.id));
  }

  let truncated = false;
  if (limitRaw !== null && limitRaw !== '') {
    const limit = Number.parseInt(limitRaw, 10);
    if (!Number.isFinite(limit) || limit < 1) {
      return NextResponse.json({ error: 'limit debe ser un entero ≥ 1' }, { status: 400 });
    }
    const cap = Math.min(500, limit);
    if (list.length > cap) {
      truncated = true;
      list = list.slice(0, cap);
    }
  }

  const payload: { data: typeof list; truncated?: boolean } = { data: list };
  if (truncated) payload.truncated = true;

  return NextResponse.json(payload);
}
