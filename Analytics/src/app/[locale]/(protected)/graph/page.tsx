'use client';

import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useCallback, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { useRequiredSession } from '@/hooks/use-required-session';
import { apiClient } from '@/lib/api/client';
import { extractItems } from '@/lib/api/helpers';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

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

interface GraphNode {
  id: string;
  label: string;
  type: string;
  value: number;
  color?: string;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number;
}

export default function GraphPage() {
  const { session } = useRequiredSession();
  const [campaignId, setCampaignId] = useState('');
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
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

  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D) => { // eslint-disable-line
    const size = Math.max(4, Math.sqrt(node.value || 1) * 3);
    const color = node.color || TYPE_COLORS[node.type] || '#94a3b8';

    // Draw circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw label
    const label = node.label;
    ctx.font = `${Math.max(10, size * 0.8)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#334155';
    ctx.fillText(label, node.x, node.y + size + 2);
  }, []);

  const nodeTypes = graphData?.nodes
    ? [...new Set(graphData.nodes.map((n) => n.type))]
    : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Grafo Ontológico</h1>
        <p className="text-sm text-slate-500">Visão relacional entre campanhas, segmentos, temas, sentimentos e regiões</p>
      </div>

      <div className="flex items-center gap-4">
        <Select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="max-w-xs">
          <option value="">Todas as campanhas</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {nodeTypes.map((type) => (
            <div key={type} className="flex items-center gap-1.5 text-xs">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: TYPE_COLORS[type] || '#94a3b8' }} />
              <span className="text-slate-600">{TYPE_LABELS[type] || type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hovered node info */}
      {hoveredNode && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm">
          <span className="font-semibold">{hoveredNode.label}</span>
          <span className="ml-2 text-slate-400">({TYPE_LABELS[hoveredNode.type] || hoveredNode.type})</span>
          <span className="ml-2 text-slate-500">{hoveredNode.value} ocorrências</span>
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        <div style={{ height: '600px', width: '100%' }}>
          {graphData && graphData.nodes.length > 0 ? (
            <ForceGraph2D
              ref={graphRef}
              graphData={{ nodes: graphData.nodes as any, links: graphData.links as any }}
              nodeCanvasObject={nodeCanvasObject}
              nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
                const size = Math.max(4, Math.sqrt(node.value || 1) * 3);
                ctx.beginPath();
                ctx.arc(node.x, node.y, size + 4, 0, 2 * Math.PI);
                ctx.fillStyle = color;
                ctx.fill();
              }}
              linkColor={() => '#e2e8f0'}
              linkWidth={(link: any) => Math.max(0.5, Math.sqrt(link.value || 1) * 0.5)}
              linkDirectionalParticles={2}
              linkDirectionalParticleWidth={(link: any) => Math.max(1, Math.sqrt(link.value || 1))}
              linkDirectionalParticleColor={() => '#94a3b8'}
              onNodeHover={(node: any) => setHoveredNode(node || null)}
              onNodeClick={(node: any) => {
                if (graphRef.current) {
                  graphRef.current.centerAt(node.x, node.y, 500);
                  graphRef.current.zoom(3, 500);
                }
              }}
              cooldownTicks={100}
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.3}
              backgroundColor="#fafafa"
              width={undefined}
              height={600}
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
    </div>
  );
}
