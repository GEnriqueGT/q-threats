export type ThreatLevel = 'high' | 'medium' | 'low' | 'possible';

export interface Threat {
  id: string;
  title: string;
  institution: string;
  amount: string;
  level: ThreatLevel;
  date: string;
  /** Referencia legislativa (Supabase law_risk_reports). */
  iniciativaId?: string;
  decretoId?: string;
}

export interface ThreatSource {
  label: string;
  url?: string;
}

export type GraphEntityKind =
  | 'person'
  | 'institution'
  | 'case'
  | 'party'
  | 'group'
  | 'beneficiary'
  | 'other';

export interface AnalysisNode {
  id: string;
  title: string;
  description: string;
  risks: string[];
  imageUrl: string;
  sources: ThreatSource[];
  /** Borde rojo (proveedor / alerta) */
  highlight?: boolean;
  role: 'institution' | 'supplier' | 'product' | 'acquisition';
  /** Tipo visual para icono en el grafo orbital. */
  entityKind?: GraphEntityKind;
  /** Persona vinculada (p. ej. en relaciones institución/caso). */
  relatedPerson?: string;
  /** Etiquetas Neo4j (grafo Relations). */
  neo4jLabels?: string[];
  /** Todas las propiedades del nodo en Neo4j, serializadas (panel de detalle). */
  detailProps?: Record<string, string>;
}

export interface AnalysisEdge {
  from: string;
  to: string;
  /** Tipo Cypher de la relación (p. ej. TRABAJA_EN). */
  relType: string;
  /** Propiedades de la relación en Neo4j, serializadas. */
  relationshipProps?: Record<string, string>;
}

export interface ConflictedDeputyInfo {
  nombre: string;
  entidadRelacionada: string;
  tipoRelacion?: string;
  sector?: string;
  conflicto: string;
  fuenteUrl?: string;
  riskLevel?: string;
  verification?: string;
}

export interface LegislativeRiskFactor {
  type: string;
  riskLevel: string;
  description: string;
  evidence?: string;
  verification?: string;
}

export interface LegislativeProcessFlag {
  flag: string;
  riskLevel: string;
  evidence: string;
}

export interface LegislativeBenefitAnalysis {
  publicBenefit?: string;
  privateBenefit?: string;
  benefitClarity?: string;
  notes?: string;
}

/** Metadatos de iniciativa/decreto desde Make.com. */
export interface LegislativeMeta {
  referenceId: string;
  iniciativaId?: string;
  decretoId?: string;
  tipoReferencia?: string;
  estado?: string;
  category?: string;
  riskLevel: ThreatLevel;
  riskScore?: string | number;
  diputadosPonentes: string[];
  bancadas: string[];
  comisiones: string[];
  entidades: string[];
  reportMarkdown?: string;
  riskFactors: LegislativeRiskFactor[];
  conflictedDeputies: ConflictedDeputyInfo[];
  processFlags: LegislativeProcessFlag[];
  benefitAnalysis?: LegislativeBenefitAnalysis;
  sources: string[];
  limitations: string[];
  posiblesBeneficiados: string[];
  actoresPoliticos: string[];
  voteTotals?: Record<string, number | null>;
}

export interface ThreatAnalysis {
  threatId: string;
  acquisition: {
    title: string;
    summary: string;
    guatecomprasUrl: string;
    institution: string;
    amount: string;
    date?: string;
  };
  nodes: AnalysisNode[];
  edges: AnalysisEdge[];
  /** Presente cuando el análisis proviene del webhook legislativo. */
  legislative?: LegislativeMeta;
}

/** @deprecated usar AnalysisNode */
export interface NodeDetail {
  id: string;
  title: string;
  description: string;
  risks: string[];
  imageUrl: string;
  sources?: string[];
}
