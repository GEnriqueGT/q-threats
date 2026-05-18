import { NextResponse } from 'next/server';
import { mapLawRiskReportToThreat, type LawRiskReportRow } from '@/lib/supabase/mapLawRiskReport';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function GET() {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase no configurado (SUPABASE_URL y SUPABASE_ANON_KEY o SERVICE_ROLE).' },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from('law_risk_reports')
    .select(
      'id, iniciativa_id, decreto_id, title, summary, estado, risk_level, risk_score, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('[recent-reports]', error);
    return NextResponse.json(
      { error: 'No se pudieron cargar los reportes recientes.' },
      { status: 502 },
    );
  }

  const rows = (data ?? []) as LawRiskReportRow[];
  return NextResponse.json({
    data: rows.map(mapLawRiskReportToThreat),
  });
}
