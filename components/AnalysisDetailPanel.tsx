'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Building2, FileText, Scale, User, Users } from 'lucide-react';
import { entityKindLabel, GraphNodeIcon } from './GraphNodeIcon';
import type {
  AnalysisNode,
  ConflictedDeputyInfo,
  LegislativeMeta,
  ThreatAnalysis,
  ThreatLevel,
} from '@/lib/types';

function riskLevelLabel(level: ThreatLevel): string {
  switch (level) {
    case 'high':
      return 'Riesgo alto';
    case 'medium':
      return 'Riesgo medio';
    case 'low':
      return 'Riesgo bajo';
    default:
      return 'Posible riesgo';
  }
}

function riskBadgeClass(level: ThreatLevel): string {
  switch (level) {
    case 'high':
      return 'bg-red-950/60 border-red-800/50 text-red-200';
    case 'medium':
      return 'bg-amber-950/60 border-amber-900/50 text-amber-100';
    case 'low':
      return 'bg-teal-950/50 border-teal-800/40 text-teal-100';
    default:
      return 'bg-zinc-800/60 border-zinc-600/40 text-white/80';
  }
}

function riskLevelClass(level: ThreatLevel): string {
  switch (level) {
    case 'high':
      return 'text-red-400';
    case 'medium':
      return 'text-amber-500';
    case 'low':
      return 'text-teal-400';
    default:
      return 'text-white/60';
  }
}

function mapRiskFromString(level: string): ThreatLevel {
  const l = level.toLowerCase();
  if (l === 'alto' || l === 'high') return 'high';
  if (l === 'medio' || l === 'medium') return 'medium';
  if (l === 'bajo' || l === 'low') return 'low';
  return 'possible';
}

function DefaultAvatar({
  highlight,
  size = 'md',
  entityKind,
}: {
  highlight?: boolean;
  size?: 'sm' | 'md';
  entityKind?: AnalysisNode['entityKind'];
}) {
  const dim = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  return (
    <div
      className={`${dim} rounded-lg flex items-center justify-center border shrink-0 ${
        highlight ? 'bg-red-950/40 border-red-500/50' : 'bg-white/10 border-white/20'
      }`}
    >
      <GraphNodeIcon kind={entityKind ?? 'person'} highlight={highlight} compact={size === 'sm'} />
    </div>
  );
}

function PanelBlock({
  title,
  icon,
  children,
  variant = 'default',
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  variant?: 'default' | 'danger';
}) {
  return (
    <section
      className={`rounded-xl border p-4 space-y-2 ${
        variant === 'danger'
          ? 'bg-red-950/15 border-red-900/35'
          : 'bg-white/[0.04] border-white/10'
      }`}
    >
      <h6 className="text-[11px] font-semibold uppercase tracking-wider text-white/45 flex items-center gap-2">
        {icon}
        {title}
      </h6>
      {children}
    </section>
  );
}

function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Fuente';
  }
}

export const DEPUTY_SELECT_PREFIX = 'deputy:';

export function deputySelectId(nombre: string): string {
  return `${DEPUTY_SELECT_PREFIX}${nombre}`;
}

export function isDeputySelectId(id: string): boolean {
  return id.startsWith(DEPUTY_SELECT_PREFIX);
}

export function deputyNameFromSelectId(id: string): string {
  return id.slice(DEPUTY_SELECT_PREFIX.length);
}

function roleLabel(role: AnalysisNode['role']): string {
  switch (role) {
    case 'institution':
      return 'Institución';
    case 'supplier':
      return 'Persona / proveedor';
    case 'product':
      return 'Entidad relacionada';
    default:
      return 'Adquisición';
  }
}

function conflictsForDeputy(leg: LegislativeMeta, nombre: string): ConflictedDeputyInfo[] {
  const key = nombre.toLowerCase();
  return leg.conflictedDeputies.filter((d) => d.nombre.toLowerCase() === key);
}

interface AnalysisDetailPanelProps {
  analysis: ThreatAnalysis;
  graphNodes: AnalysisNode[];
  selectedId: string;
  onSelectId: (id: string) => void;
}

export function AnalysisDetailPanel({
  analysis,
  graphNodes,
  selectedId,
  onSelectId,
}: AnalysisDetailPanelProps) {
  const leg = analysis.legislative;
  const acquisitionNode = analysis.nodes.find((n) => n.role === 'acquisition');
  const activeId = selectedId || 'acquisition';

  const selectedNode = useMemo(() => {
    if (activeId === 'acquisition') return acquisitionNode ?? null;
    if (isDeputySelectId(activeId)) return null;
    return graphNodes.find((n) => n.id === activeId) ?? analysis.nodes.find((n) => n.id === activeId) ?? null;
  }, [activeId, acquisitionNode, graphNodes, analysis.nodes]);

  const selectedDeputyName = isDeputySelectId(activeId) ? deputyNameFromSelectId(activeId) : null;

  const conflictedNames = useMemo(() => {
    if (!leg) return new Set<string>();
    return new Set(leg.conflictedDeputies.map((d) => d.nombre.toLowerCase()));
  }, [leg]);

  const isLawView = activeId === 'acquisition';
  const isPonentesGroup = activeId === 'group-ponentes';
  const isBeneficiariosGroup = activeId === 'group-beneficiarios';

  const headerTitle =
    selectedDeputyName ??
    (isPonentesGroup
      ? `${leg?.diputadosPonentes.length ?? 0} diputados ponentes`
      : isBeneficiariosGroup
        ? 'Beneficiarios externos'
        : selectedNode?.title) ??
    analysis.acquisition.title;

  const headerSubtitle = selectedDeputyName
    ? 'Diputado ponente'
    : activeId === 'group-ponentes'
      ? 'Grupo legislativo'
      : activeId === 'group-beneficiarios'
        ? 'Actores externos'
        : selectedNode?.entityKind
          ? entityKindLabel(selectedNode.entityKind)
          : selectedNode
            ? roleLabel(selectedNode.role)
            : leg?.category ?? 'Iniciativa';

  const deputyConflicts = leg && selectedDeputyName ? conflictsForDeputy(leg, selectedDeputyName) : [];

  return (
    <div className="flex flex-col gap-4">
      {/* Cabecera de selección */}
      <div className="flex items-start gap-3 p-3 rounded-xl bg-teal-500/10 border border-teal-500/25">
        {selectedNode?.imageUrl ? (
          <div
            className={`w-11 h-11 rounded-lg overflow-hidden border shrink-0 ${
              selectedNode.highlight ? 'border-red-500' : 'border-white/20'
            }`}
          >
            <img
              src={selectedNode.imageUrl}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        ) : (
          <DefaultAvatar
            highlight={
              selectedNode?.highlight ||
              (selectedDeputyName ? conflictedNames.has(selectedDeputyName.toLowerCase()) : false)
            }
            entityKind={
              selectedNode?.entityKind ??
              (isPonentesGroup ? 'group' : isBeneficiariosGroup ? 'beneficiary' : 'person')
            }
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-white font-semibold text-sm leading-snug">{headerTitle}</p>
          <p className="text-teal-400/80 text-xs mt-0.5">{headerSubtitle}</p>
        </div>
        {leg && isLawView && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border shrink-0 ${riskBadgeClass(leg.riskLevel)}`}>
            {riskLevelLabel(leg.riskLevel)}
          </span>
        )}
      </div>

      {/* Bloques según selección */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeId}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
        {isLawView && leg && (
          <>
            <PanelBlock title="Resumen" icon={<FileText className="w-3.5 h-3.5" />}>
              <p className="text-white/75 text-sm leading-relaxed">{analysis.acquisition.summary}</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {leg.iniciativaId && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/55">
                    Iniciativa {leg.iniciativaId}
                  </span>
                )}
                {leg.estado && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/55 capitalize">
                    {leg.estado}
                  </span>
                )}
                {leg.riskScore != null && leg.riskScore !== '' && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/55">
                    Puntuación {leg.riskScore}/100
                  </span>
                )}
              </div>
            </PanelBlock>

            {leg.reportMarkdown && (
              <PanelBlock title="Análisis de riesgo" icon={<Scale className="w-3.5 h-3.5" />}>
                <p className="text-white/70 text-xs leading-relaxed line-clamp-6">{leg.reportMarkdown}</p>
              </PanelBlock>
            )}

            {leg.riskFactors.length > 0 && (
              <PanelBlock title="Factores de riesgo" icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}>
                <ul className="space-y-2">
                  {leg.riskFactors.slice(0, 4).map((f, i) => (
                    <li key={`${f.type}-${i}`} className="text-xs border-t border-white/5 pt-2 first:border-0 first:pt-0">
                      <div className="flex justify-between gap-2">
                        <span className="text-white/85 capitalize">{f.type.replace(/_/g, ' ')}</span>
                        <span className={`font-medium ${riskLevelClass(mapRiskFromString(f.riskLevel))}`}>
                          {f.riskLevel}
                        </span>
                      </div>
                      <p className="text-white/55 mt-0.5">{f.description}</p>
                    </li>
                  ))}
                </ul>
              </PanelBlock>
            )}

            {leg.processFlags.length > 0 && (
              <PanelBlock title="Proceso legislativo">
                <ul className="space-y-1.5 text-xs text-white/65">
                  {leg.processFlags.map((f, i) => (
                    <li key={`${f.flag}-${i}`}>• {f.flag}</li>
                  ))}
                </ul>
              </PanelBlock>
            )}

            {leg.benefitAnalysis && (
              <PanelBlock title="Beneficios">
                {leg.benefitAnalysis.publicBenefit && (
                  <p className="text-xs text-white/70">
                    <span className="text-teal-400/90">Público: </span>
                    {leg.benefitAnalysis.publicBenefit}
                  </p>
                )}
                {leg.benefitAnalysis.privateBenefit && (
                  <p className="text-xs text-white/70 mt-1">
                    <span className="text-amber-400/90">Privado: </span>
                    {leg.benefitAnalysis.privateBenefit}
                  </p>
                )}
              </PanelBlock>
            )}
          </>
        )}

        {selectedDeputyName && leg && (
          <>
            <PanelBlock
              title="Perfil"
              icon={<Users className="w-3.5 h-3.5" />}
              variant={deputyConflicts.length > 0 ? 'danger' : 'default'}
            >
              <p className="text-white/70 text-xs">
                Integrante de la lista de diputados ponentes de esta iniciativa.
              </p>
              {deputyConflicts.length > 0 && (
                <p className="text-red-300/90 text-xs font-medium mt-1">
                  {deputyConflicts.length} posible{deputyConflicts.length > 1 ? 's' : ''} conflicto
                  de interés registrado{deputyConflicts.length > 1 ? 's' : ''}
                </p>
              )}
            </PanelBlock>

            {deputyConflicts.map((d, i) => (
              <PanelBlock
                key={`${d.entidadRelacionada}-${i}`}
                title={d.entidadRelacionada}
                icon={<AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                variant="danger"
              >
                {d.tipoRelacion && (
                  <p className="text-red-200/70 text-[11px]">{d.tipoRelacion}</p>
                )}
                <p className="text-white/70 text-xs leading-relaxed">{d.conflicto}</p>
                {d.fuenteUrl && (
                  <a
                    href={d.fuenteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-[11px] text-teal-400 hover:underline mt-1"
                  >
                    Ver fuente
                  </a>
                )}
              </PanelBlock>
            ))}

            {deputyConflicts.length === 0 && (
              <PanelBlock title="Antecedentes">
                <p className="text-white/50 text-xs">
                  No hay conflictos de interés registrados para este diputado en esta iniciativa.
                </p>
              </PanelBlock>
            )}
          </>
        )}

        {isPonentesGroup && leg && (
          <PanelBlock title="Diputados ponentes" icon={<Users className="w-3.5 h-3.5" />}>
            <p className="text-white/65 text-xs mb-2">
              {leg.diputadosPonentes.length} diputados impulsan esta iniciativa. Los marcados en rojo
              tienen posibles conflictos de interés.
            </p>
            <div className="flex flex-wrap gap-1 max-h-[200px] overflow-y-auto">
              {leg.diputadosPonentes.map((nombre) => {
                const isConflict = conflictedNames.has(nombre.toLowerCase());
                return (
                  <button
                    key={nombre}
                    type="button"
                    onClick={() => onSelectId(deputySelectId(nombre))}
                    className={`px-2 py-1 rounded-md text-[11px] border text-left transition ${
                      isConflict
                        ? 'bg-red-950/30 border-red-900/40 text-red-200/90 hover:bg-red-950/45'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {nombre}
                  </button>
                );
              })}
            </div>
          </PanelBlock>
        )}

        {isBeneficiariosGroup && leg && (
          <PanelBlock title="Beneficiarios externos" icon={<Building2 className="w-3.5 h-3.5" />}>
            <ul className="space-y-1.5 text-xs text-white/75">
              {(leg.posiblesBeneficiados ?? []).map((b) => (
                <li key={b}>• {b}</li>
              ))}
            </ul>
            {leg.benefitAnalysis?.privateBenefit && (
              <p className="text-white/55 text-xs mt-2 border-t border-white/10 pt-2">
                {leg.benefitAnalysis.privateBenefit}
              </p>
            )}
          </PanelBlock>
        )}

        {selectedNode && !isLawView && !selectedDeputyName && !isPonentesGroup && !isBeneficiariosGroup && (
          <>
            <PanelBlock title="Descripción">
              <p className="text-white/75 text-sm leading-relaxed">
                {selectedNode.description || 'Sin descripción adicional.'}
              </p>
            </PanelBlock>

            {selectedNode.risks.length > 0 && (
              <PanelBlock
                title="Riesgos"
                icon={<AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                variant={selectedNode.highlight ? 'danger' : 'default'}
              >
                <ul className="space-y-1.5 text-xs text-white/75">
                  {selectedNode.risks.map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-red-400 shrink-0">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </PanelBlock>
            )}

            {selectedNode.sources.length > 0 && (
              <PanelBlock title="Fuentes">
                <div className="flex flex-wrap gap-1.5">
                  {selectedNode.sources.map((s) =>
                    s.url ? (
                      <a
                        key={s.label}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] text-white/75 hover:bg-white/10"
                      >
                        {s.label}
                      </a>
                    ) : (
                      <span
                        key={s.label}
                        className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] text-white/75"
                      >
                        {s.label}
                      </span>
                    ),
                  )}
                </div>
              </PanelBlock>
            )}

            {leg && selectedNode.relatedPerson && (
              <PanelBlock title="Persona vinculada">
                <button
                  type="button"
                  onClick={() => onSelectId(deputySelectId(selectedNode.relatedPerson!))}
                  className="text-xs text-teal-400 hover:underline"
                >
                  Ver perfil de {selectedNode.relatedPerson}
                </button>
              </PanelBlock>
            )}

          </>
        )}

        {!leg && selectedNode && !isLawView && (
          <>
            <PanelBlock title="Descripción">
              <p className="text-white/75 text-sm">{selectedNode.description}</p>
            </PanelBlock>
            {selectedNode.risks.length > 0 && (
              <PanelBlock title="Riesgos identificados" variant={selectedNode.highlight ? 'danger' : 'default'}>
                <ul className="text-xs text-white/75 space-y-1">
                  {selectedNode.risks.map((r, i) => (
                    <li key={i}>• {r}</li>
                  ))}
                </ul>
              </PanelBlock>
            )}
          </>
        )}

        {isLawView && leg && leg.sources.length > 0 && (
          <PanelBlock title="Fuentes">
            <div className="flex flex-wrap gap-1.5">
              {leg.sources.slice(0, 6).map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] text-white/75 hover:bg-white/10"
                >
                  {sourceHost(url)}
                </a>
              ))}
            </div>
          </PanelBlock>
        )}
        </motion.div>
      </AnimatePresence>

      {/* Índice compacto */}
      {leg && (
        <div className="space-y-2 pt-2 border-t border-white/10">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Explorar
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onSelectId('acquisition')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition ${
                activeId === 'acquisition'
                  ? 'bg-teal-500/25 border-teal-500/40 text-teal-100'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
              }`}
            >
              Iniciativa
            </button>
          </div>

          {(['person', 'institution', 'case', 'party', 'group', 'beneficiary', 'other'] as const).map(
            (kind) => {
              const items = graphNodes.filter((n) => (n.entityKind ?? 'other') === kind);
              if (items.length === 0) return null;
              return (
                <div key={kind} className="space-y-1">
                  <p className="text-[9px] uppercase tracking-wider text-white/35">
                    {entityKindLabel(kind)}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {items.map((node) => (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => onSelectId(node.id)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition max-w-[130px] truncate ${
                          activeId === node.id
                            ? 'bg-teal-500/25 border-teal-500/40 text-teal-100'
                            : node.highlight
                              ? 'bg-red-950/30 border-red-900/40 text-red-200/90'
                              : 'bg-white/5 border-white/10 text-white/55 hover:bg-white/10'
                        }`}
                        title={node.title}
                      >
                        {node.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            },
          )}

          {leg.diputadosPonentes.length > 0 && (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40 pt-1">
                Ponentes
              </p>
              <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto pr-0.5">
                {leg.diputadosPonentes.map((nombre) => {
                  const id = deputySelectId(nombre);
                  const isConflict = conflictedNames.has(nombre.toLowerCase());
                  return (
                    <button
                      key={nombre}
                      type="button"
                      onClick={() => onSelectId(id)}
                      className={`px-2 py-0.5 rounded text-[10px] border transition truncate max-w-[130px] ${
                        activeId === id
                          ? 'bg-teal-500/25 border-teal-500/40 text-teal-100'
                          : isConflict
                            ? 'bg-red-950/25 border-red-900/35 text-red-200/80 hover:bg-red-950/35'
                            : 'bg-white/5 border-white/10 text-white/55 hover:bg-white/10'
                      }`}
                      title={nombre}
                    >
                      {nombre.split(' ')[0]} {nombre.split(' ').slice(-1)[0]?.charAt(0)}.
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {!leg && graphNodes.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-white/10">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Entidades
          </p>
          <div className="space-y-1">
            {graphNodes.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => onSelectId(node.id)}
                className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs transition ${
                  activeId === node.id
                    ? 'bg-teal-500/20 border border-teal-500/30'
                    : 'bg-white/5 border border-transparent hover:bg-white/10'
                }`}
              >
                <DefaultAvatar highlight={node.highlight} size="sm" />
                <span className="text-white/85 truncate">{node.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
