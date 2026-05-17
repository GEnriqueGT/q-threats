import { NextResponse } from 'next/server';
import { fetchLegislationFromMake, MakeFetchError } from '@/lib/make/fetchLegislationFromMake';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const analysis = await fetchLegislationFromMake(decodeURIComponent(id));
    return NextResponse.json({ data: analysis });
  } catch (err) {
    if (err instanceof MakeFetchError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[legislation]', err);
    return NextResponse.json(
      { error: 'No se pudo obtener el análisis legislativo.' },
      { status: 500 },
    );
  }
}
