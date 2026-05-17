import { NextRequest, NextResponse } from 'next/server';
import { analysisNodeIds, nodeDetails } from '@/lib/data';

export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get('ids');
  const ids = idsParam
    ? idsParam.split(',').map((id) => id.trim())
    : [...analysisNodeIds];

  const nodes = ids
    .map((id) => nodeDetails[id])
    .filter((node): node is NonNullable<typeof node> => Boolean(node));

  return NextResponse.json({ data: nodes });
}
