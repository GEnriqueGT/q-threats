import type { NodeDetail, Threat, ThreatAnalysis } from './types';

export const threats: Threat[] = [
  {
    id: 't1',
    title: 'Compra Insumos',
    institution: 'Inacif',
    amount: 'Q2,000,000',
    level: 'high',
    date: '12 FEB',
  },
  {
    id: 't2',
    title: 'Reforma Ley',
    institution: 'Congreso',
    amount: 'Lavado de dinero',
    level: 'medium',
    date: '12 FEB',
  },
  {
    id: 't3',
    title: 'Compra Equipo',
    institution: 'Municipalidad',
    amount: 'Q10,000',
    level: 'possible',
    date: '12 FEB',
  },
];

const GUATECOMPRAS_T1 =
  'https://www.guatecompras.gt/concursos/consultaConcurso.aspx?nog=29823919&lper=2026&iEnt=439&iUnt=0&iTipo=4&o=22';

export const threatAnalyses: Record<string, ThreatAnalysis> = {
  t1: {
    threatId: 't1',
    acquisition: {
      title: 'Compra de insumos — INACIF',
      summary:
        'Se realizó la compra de insumos a la empresa Odebrecht el día 15 de febrero de 2026 con un monto de Q2,000,000 en calidad de compra directa. La convocatoria fue publicada por la empresa Odebrecht el día 10 de febrero de 2026.',
      guatecomprasUrl: GUATECOMPRAS_T1,
      institution: 'INACIF',
      amount: 'Q2,000,000',
    },
    nodes: [
      {
        id: 'acquisition',
        title: 'Adquisición',
        description: 'Resumen de la compra directa publicada en Guatecompras.',
        risks: [],
        imageUrl: '',
        sources: [],
        role: 'acquisition',
      },
      {
        id: 'odebrecht',
        title: 'Odebrecht',
        description: 'Proveedor adjudicado en la compra directa.',
        risks: [
          'La empresa Odebrecht tiene señalamientos de corrupción y un proceso legal activo.',
          'Historial de sobornos en contratos públicos en la región.',
        ],
        imageUrl:
          'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=400&h=400',
        sources: [
          { label: 'Prensa Libre', url: 'https://www.prensalibre.com' },
          { label: 'El Periódico', url: 'https://elperiodico.com.gt' },
        ],
        highlight: true,
        role: 'supplier',
      },
      {
        id: 'inacif',
        title: 'INACIF',
        description: 'Instituto Nacional de Ciencias Forenses de Guatemala — entidad contratante.',
        risks: [
          'Compra directa sin proceso competitivo abierto para un monto elevado.',
          'Plazos de publicación y adjudicación muy cortos.',
        ],
        imageUrl: '/logos/inacif.svg',
        sources: [{ label: 'Guatecompras', url: GUATECOMPRAS_T1 }],
        role: 'institution',
      },
      {
        id: 'bloque',
        title: 'Materiales',
        description: 'Insumos de construcción (bloques de concreto) incluidos en la adquisición.',
        risks: [
          'Precio unitario reportado equivalente al mercado minorista.',
          'Posible sobrevaloración frente a cotizaciones del sector.',
        ],
        imageUrl:
          'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&q=80&w=400&h=400',
        sources: [{ label: 'Diario de Centro América' }],
        highlight: true,
        role: 'product',
      },
    ],
    edges: [
      { from: 'acquisition', to: 'inacif' },
      { from: 'acquisition', to: 'odebrecht' },
      { from: 'acquisition', to: 'bloque' },
      { from: 'inacif', to: 'odebrecht' },
      { from: 'inacif', to: 'bloque' },
    ],
  },
  t2: {
    threatId: 't2',
    acquisition: {
      title: 'Reforma Ley — Congreso',
      summary:
        'Iniciativa de reforma con disposiciones que debilitan controles de lavado de activos en contrataciones públicas.',
      guatecomprasUrl: 'https://www.guatecompras.gt',
      institution: 'Congreso',
      amount: 'Lavado de dinero',
    },
    nodes: [
      {
        id: 'acquisition',
        title: 'Adquisición',
        description: 'Marco normativo en discusión.',
        risks: [],
        imageUrl: '',
        sources: [],
        role: 'acquisition',
      },
      {
        id: 'congreso',
        title: 'Congreso',
        description: 'Entidad proponente de la reforma.',
        risks: ['Reducción de plazos de auditoría', 'Excepciones amplias para compras directas'],
        imageUrl:
          'https://images.unsplash.com/photo-1529107386315-e1a2ae48a520?auto=format&fit=crop&q=80&w=400&h=400',
        sources: [{ label: 'La Hora' }],
        role: 'institution',
      },
    ],
    edges: [
      { from: 'acquisition', to: 'congreso' },
    ],
  },
  t3: {
    threatId: 't3',
    acquisition: {
      title: 'Compra Equipo — Municipalidad',
      summary: 'Adquisición de equipo por Q10,000 con posible fragmentación de contrato.',
      guatecomprasUrl: 'https://www.guatecompras.gt',
      institution: 'Municipalidad',
      amount: 'Q10,000',
    },
    nodes: [
      {
        id: 'acquisition',
        title: 'Adquisición',
        description: 'Compra municipal de equipo.',
        risks: [],
        imageUrl: '',
        sources: [],
        role: 'acquisition',
      },
      {
        id: 'municipalidad',
        title: 'Municipalidad',
        description: 'Entidad compradora.',
        risks: ['Monto cercano al umbral de licitación', 'Proveedor único recurrente'],
        imageUrl:
          'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&q=80&w=400&h=400',
        sources: [{ label: 'Municipalidad — portal transparencia' }],
        role: 'institution',
      },
    ],
    edges: [{ from: 'acquisition', to: 'municipalidad' }],
  },
};

export const nodeDetails: Record<string, NodeDetail> = {
  odebrecht: {
    id: 'odebrecht',
    title: 'Odebrecht',
    description: threatAnalyses.t1.nodes.find((n) => n.id === 'odebrecht')!.description,
    risks: threatAnalyses.t1.nodes.find((n) => n.id === 'odebrecht')!.risks,
    imageUrl: threatAnalyses.t1.nodes.find((n) => n.id === 'odebrecht')!.imageUrl,
    sources: threatAnalyses.t1.nodes.find((n) => n.id === 'odebrecht')!.sources.map((s) => s.label),
  },
  inacif: {
    id: 'inacif',
    title: 'INACIF',
    description: threatAnalyses.t1.nodes.find((n) => n.id === 'inacif')!.description,
    risks: threatAnalyses.t1.nodes.find((n) => n.id === 'inacif')!.risks,
    imageUrl: threatAnalyses.t1.nodes.find((n) => n.id === 'inacif')!.imageUrl,
    sources: threatAnalyses.t1.nodes.find((n) => n.id === 'inacif')!.sources.map((s) => s.label),
  },
  bloque: {
    id: 'bloque',
    title: 'Materiales',
    description: threatAnalyses.t1.nodes.find((n) => n.id === 'bloque')!.description,
    risks: threatAnalyses.t1.nodes.find((n) => n.id === 'bloque')!.risks,
    imageUrl: threatAnalyses.t1.nodes.find((n) => n.id === 'bloque')!.imageUrl,
    sources: threatAnalyses.t1.nodes.find((n) => n.id === 'bloque')!.sources.map((s) => s.label),
  },
};

export const departments: string[] = [
  'Alta Verapaz',
  'Baja Verapaz',
  'Chimaltenango',
  'Chiquimula',
  'Petén',
  'El Progreso',
  'Quiché',
  'Escuintla',
  'Guatemala',
  'Huehuetenango',
  'Izabal',
  'Jalapa',
  'Jutiapa',
  'Quetzaltenango',
  'Retalhuleu',
  'Sacatepéquez',
  'San Marcos',
  'Santa Rosa',
  'Sololá',
  'Suchitepéquez',
  'Totonicapán',
  'Zacapa',
];

export const analysisNodeIds = ['odebrecht', 'inacif', 'bloque'] as const;

export function getThreatAnalysis(threatId: string): ThreatAnalysis | null {
  return threatAnalyses[threatId] ?? threatAnalyses.t1;
}
