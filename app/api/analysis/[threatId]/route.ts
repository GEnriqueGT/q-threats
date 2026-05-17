import { NextResponse } from 'next/server';
import { getThreatAnalysis } from '@/lib/data';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ threatId: string }> },
) {
  const { threatId } = await params;
  const analysis = getThreatAnalysis(threatId);

  if (!analysis) {
    return NextResponse.json({ error: 'Análisis no encontrado' }, { status: 404 });
  }

  return NextResponse.json({ data: analysis });
}
