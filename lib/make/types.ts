/** Respuesta del webhook Make.com para análisis legislativo. */

export interface MakeGraphNode {
  id: string;
  type: string;
  label: string;
  subtitle?: string;
  risk_level?: string;
  risk_score?: string | number;
  image_url?: string | null;
}

export interface MakeGraph {
  center: MakeGraphNode;
  nodes: MakeGraphNode[];
  edges: Array<{ from?: string; to?: string; source?: string; target?: string }>;
}

export interface MakeLegislationDetail {
  category?: string;
  headline?: string;
  description?: string;
  estado?: string;
  risk_level?: string;
  risk_score?: string | number;
  date?: string;
  amount?: string | number | null;
  report_markdown?: string;
}

export interface MakeRiskBlock {
  level?: string;
  score?: string | number;
  summary?: string;
  factors?: MakeRiskFactor[];
}

export interface MakeRiskFactor {
  type?: string;
  risk_level?: string;
  description?: string;
  evidence?: string;
  verification?: string;
}

export interface MakeConflictedDeputy {
  nombre?: string;
  voto?: string;
  risk_level?: string;
  entidad_relacionada?: string;
  tipo_entidad?: string;
  tipo_relacion?: string;
  sector?: string;
  por_que_representa_conflicto?: string;
  fuente_url?: string;
  confianza?: string;
  verification?: string;
}

export interface MakeRelationship {
  persona_origen?: string;
  entidad_relacionada?: string;
  tipo_entidad?: string;
  sector?: string;
  tipo_relacion?: string;
  categoria?: string;
  evidencia?: string;
  fuente_url?: string;
  confianza?: string;
  relevancia_para_la_ley?: string;
}

export interface MakeProcessFlag {
  flag?: string;
  risk_level?: string;
  evidence?: string;
}

export interface MakeBenefitAnalysis {
  public_benefit?: string;
  possible_private_or_institutional_benefit?: string;
  benefit_clarity?: string;
  notes?: string;
}

export interface MakeReportJson {
  title?: string;
  summary?: string;
  estado?: string;
  risk_level?: string;
  risk_score?: number | string;
  risk_factors?: MakeRiskFactor[];
  conflicted_deputies?: MakeConflictedDeputy[];
  relationships?: MakeRelationship[];
  process_flags?: MakeProcessFlag[];
  benefit_analysis?: MakeBenefitAnalysis;
  sources?: string[];
  report_markdown?: string;
  limitations?: string[];
}

export interface MakeLawJson {
  iniciativa_id?: string;
  decreto_id?: string;
  tipo_referencia?: string;
  title?: string;
  summary?: string;
  estado?: string;
  fecha_ultima_accion?: string | null;
  fecha_aprobacion?: string | null;
  impulsores?: {
    diputados_ponentes?: string[];
    bancadas?: string[];
    comisiones?: string[];
    entidades?: string[];
  };
  sources?: string[];
  limitations?: string[];
  posibles_beneficiados_externos?: string[];
  actores_politicos_vinculados?: string[];
  verification_summary?: Record<string, unknown>;
}

export interface MakeLegislativeBlock {
  iniciativa_id?: string;
  decreto_id?: string;
  estado?: string;
  tipo_referencia?: string;
  impulsores?: {
    diputados_ponentes?: string[];
    bancadas?: string[];
    comisiones?: string[];
    entidades?: string[];
    presuntos_impulsores?: string[];
  };
  vote_totals?: Record<string, number | null>;
}

export interface MakeLegislationPayload {
  id?: string;
  iniciativa_id?: string;
  decreto_id?: string;
  tipo_referencia?: string;
  title?: string;
  summary?: string;
  estado?: string;
  risk_level?: string;
  risk_score?: string | number;
  fecha_aprobacion?: string;
  fecha_ultima_accion?: string;
  graph?: MakeGraph;
  detail?: MakeLegislationDetail;
  risk?: MakeRiskBlock;
  legislative?: MakeLegislativeBlock;
  raw?: {
    law_json?: MakeLawJson;
    report_json?: MakeReportJson;
    raw_search_json?: string;
  };
}

export interface MakeWebhookResponse {
  ok?: boolean;
  cached?: boolean;
  data?: MakeLegislationPayload;
  error?: string;
  message?: string;
}
