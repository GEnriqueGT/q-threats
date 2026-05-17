export type ThreatLevel = 'high' | 'medium' | 'low' | 'possible';

export interface Threat {
  id: string;
  title: string;
  institution: string;
  amount: string;
  level: ThreatLevel;
  date: string;
}

export interface ThreatSource {
  label: string;
  url?: string;
}

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
  /** Etiquetas Neo4j (grafo Relations). */
  neo4jLabels?: string[];
  /** Todas las propiedades del nodo en Neo4j, serializadas (panel de detalle). */
  detailProps?: Record<string, string>;
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
  edges: { from: string; to: string }[];
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
