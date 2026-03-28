'use client';

import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useCallback, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { useRequiredSession } from '@/hooks/use-required-session';
import { apiClient } from '@/lib/api/client';
import { extractItems } from '@/lib/api/helpers';

const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false });

const TYPE_COLORS: Record<string, string> = {
  campaign: '#6366f1',
  segment: '#8b5cf6',
  topic: '#06b6d4',
  sentiment: '#f59e0b',
  nps_class: '#10b981',
  region: '#ec4899',
};

const TYPE_LABELS: Record<string, string> = {
  campaign: 'Campanha',
  segment: 'Segmento',
  topic: 'Tema',
  sentiment: 'Sentimento',
  nps_class: 'Classe NPS',
  region: 'Região',
};

export default function GraphPage() {
  const { session } = useRequiredSession();
  const [campaignId, setCampaignId] = useState('');
  const [hoveredNode, setHoveredNode] = useState<any>(null); // eslint-disable-line
  const graphRef = useRef<any>(null); // eslint-disable-line

  const campaignsQuery = useQuery({
    queryKey: ['graph-campaigns'],
    queryFn: () => apiClient.campaigns.list(session!, { page_size: 100 }),
    enabled: Boolean(session),
  });
  const campaigns = extractItems(campaignsQuery.data).filter((c) => c.status !== 'draft');

  const graphQuery = useQuery({
    queryKey: ['graph-data', campaignId],
    queryFn: () => apiClient.reports.graph(session!, campaignId || undefined),
    enabled: Boolean(session),
  });

  const graphData = graphQuery.data;
  const nodeTypes = graphData?.nodes ? [...new Set(graphData.nodes.map((n) => n.type))] : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Grafo Ontológico 3D</h1>
        <p className="text-sm text-slate-500">Visão relacional entre campanhas, segmentos, temas, sentimentos e regiões</p>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <Select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="max-w-xs">
          <option value="">Todas as campanhas</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>

        <div className="flex flex-wrap gap-3">
          {nodeTypes.map((type) => (
            <div key={type} className="flex items-center gap-1.5 text-xs">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: TYPE_COLORS[type] || '#94a3b8' }} />
              <span className="text-slate-600">{TYPE_LABELS[type] || type}</span>
            </div>
          ))}
        </div>
      </div>

      {hoveredNode && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm">
          <span className="font-semibold">{hoveredNode.label}</span>
          <span className="ml-2 text-slate-400">({TYPE_LABELS[hoveredNode.type] || hoveredNode.type})</span>
          <span className="ml-2 text-slate-500">{hoveredNode.value} ocorrências</span>
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        <div style={{ height: '650px', width: '100%' }}>
          {graphData && graphData.nodes.length > 0 ? (
            <ForceGraph3D
              ref={graphRef}
              graphData={{ nodes: graphData.nodes as any, links: graphData.links as any }}
              nodeLabel={(node: any) => `<div style="background:#1e293b;color:white;padding:4px 8px;border-radius:6px;font-size:12px"><b>${node.label}</b><br/><span style="opacity:0.7">${TYPE_LABELS[node.type] || node.type} · ${node.value} ocorrências</span></div>`}
              nodeColor={(node: any) => node.color || TYPE_COLORS[node.type] || '#94a3b8'}
              nodeVal={(node: any) => Math.max(1, Math.sqrt(node.value || 1) * 2)}
              nodeOpacity={0.9}
              nodeResolution={16}
              linkColor={(link: any) => {
                const src = typeof link.source === 'object' ? link.source : null;
                const color = src?.color || TYPE_COLORS[src?.type] || '#94a3b8';
                return color + '60';
              }}
              linkWidth={(link: any) => Math.max(0.2, Math.sqrt(link.value || 1) * 0.3)}
              linkOpacity={0.4}
              linkDirectionalParticles={1}
              linkDirectionalParticleWidth={1.5}
              linkDirectionalParticleSpeed={0.004}
              linkDirectionalParticleColor={(link: any) => {
                const src = typeof link.source === 'object' ? link.source : null;
                return src?.color || TYPE_COLORS[src?.type] || '#94a3b8';
              }}
              linkCurvature={0.1}
              onNodeHover={(node: any) => setHoveredNode(node || null)}
              onNodeClick={(node: any) => {
                if (graphRef.current && node) {
                  const distance = 80;
                  const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
                  graphRef.current.cameraPosition(
                    { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
                    node,
                    1000
                  );
                }
              }}
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.3}
              d3Force={'charge'}
              backgroundColor="#f8fafc"
              showNavInfo={false}
              width={undefined}
              height={650}
            />
          ) : graphQuery.isLoading ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-slate-400">Carregando grafo...</p>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-slate-400">Sem dados para exibir</p>
            </div>
          )}
        </div>
      </Card>

      <p className="text-xs text-slate-400 text-center">Arraste para rotacionar · Scroll para zoom · Clique num nó para focar</p>
    </div>
  );
}
