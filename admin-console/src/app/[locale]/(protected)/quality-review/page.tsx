'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PermissionGate } from '@/components/layout/permission-gate';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { apiClient } from '@/lib/api/client';
import { useRequiredSession } from '@/hooks/use-required-session';

interface ReviewItem {
  id: string;
  interview_id: string;
  review_status: string;
  respondent_name: string;
  campaign_name: string;
  nps_score: number | null;
  sentiment: string | null;
  summary_text: string | null;
  transcription_text: string | null;
  score: number | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
}

export default function QualityReviewPage() {
  const { session } = useRequiredSession();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [reviewScore, setReviewScore] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');

  const statsQuery = useQuery({
    queryKey: ['quality-stats'],
    queryFn: () => apiClient.qualityReviews.stats(session!),
    enabled: Boolean(session),
  });

  const listQuery = useQuery({
    queryKey: ['quality-reviews', statusFilter],
    queryFn: () => apiClient.qualityReviews.list(session!, statusFilter || undefined),
    enabled: Boolean(session),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.qualityReviews.approve(session!, id, {
        score: reviewScore ? Number(reviewScore) : undefined,
        notes: reviewNotes || undefined,
      }),
    onSuccess: () => {
      setShowDetail(false);
      queryClient.invalidateQueries({ queryKey: ['quality-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['quality-stats'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.qualityReviews.reject(session!, id, {
        score: reviewScore ? Number(reviewScore) : undefined,
        notes: reviewNotes || undefined,
      }),
    onSuccess: () => {
      setShowDetail(false);
      queryClient.invalidateQueries({ queryKey: ['quality-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['quality-stats'] });
    },
  });

  const reviews = (listQuery.data as ReviewItem[]) || [];
  const stats = statsQuery.data;

  const openReview = (review: ReviewItem) => {
    setSelectedReview(review);
    setReviewScore(review.score?.toString() || '');
    setReviewNotes(review.notes || '');
    setShowDetail(true);
  };

  const sentimentBadge = (s: string | null) => {
    if (!s) return <Badge tone="neutral">—</Badge>;
    const tones: Record<string, 'success' | 'danger' | 'warning' | 'neutral'> = {
      positive: 'success', negative: 'danger', neutral: 'warning', mixed: 'neutral',
    };
    return <Badge tone={tones[s] || 'neutral'}>{s}</Badge>;
  };

  const statusBadge = (s: string) => {
    const tones: Record<string, 'success' | 'danger' | 'warning' | 'neutral'> = {
      pending: 'warning', approved: 'success', rejected: 'danger',
    };
    return <Badge tone={tones[s] || 'neutral'}>{s === 'pending' ? 'Pendente' : s === 'approved' ? 'Aprovada' : 'Rejeitada'}</Badge>;
  };

  return (
    <PermissionGate permission="report.read">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Controle de Qualidade</h1>

        {/* Stats */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-l-4 border-l-amber-500">
              <p className="text-xs font-medium uppercase text-slate-500">Pendentes</p>
              <p className="mt-1 text-3xl font-bold text-amber-600">{stats.pending}</p>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <p className="text-xs font-medium uppercase text-slate-500">Aprovadas</p>
              <p className="mt-1 text-3xl font-bold text-green-600">{stats.approved}</p>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <p className="text-xs font-medium uppercase text-slate-500">Rejeitadas</p>
              <p className="mt-1 text-3xl font-bold text-red-600">{stats.rejected}</p>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <p className="text-xs font-medium uppercase text-slate-500">Score Médio</p>
              <p className="mt-1 text-3xl font-bold text-blue-600">{stats.avg_score ?? '—'}</p>
            </Card>
          </div>
        )}

        {/* Filter */}
        <Card>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">Filtrar por status</label>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="max-w-xs">
              <option value="pending">Pendentes</option>
              <option value="approved">Aprovadas</option>
              <option value="rejected">Rejeitadas</option>
              <option value="">Todas</option>
            </Select>
          </div>
        </Card>

        {/* Review List */}
        <Card title="Entrevistas para revisão">
          {reviews.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Nenhuma entrevista para revisar</p>
          ) : (
            <div className="space-y-2">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 p-3 transition hover:bg-slate-50"
                  onClick={() => openReview(r)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.respondent_name}</span>
                      {statusBadge(r.review_status)}
                      {r.nps_score !== null && (
                        <Badge tone={r.nps_score >= 9 ? 'success' : r.nps_score >= 7 ? 'warning' : 'danger'}>
                          NPS {r.nps_score}
                        </Badge>
                      )}
                      {sentimentBadge(r.sentiment)}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {r.campaign_name} · {r.completed_at ? new Date(r.completed_at).toLocaleDateString('pt-BR') : '—'}
                    </p>
                    {r.summary_text && (
                      <p className="mt-1 truncate text-sm text-slate-600">{r.summary_text}</p>
                    )}
                  </div>
                  <Button variant="ghost" className="text-xs">Revisar</Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Review Detail Dialog */}
        <Dialog open={showDetail} onOpenChange={setShowDetail}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Revisão de Entrevista</DialogTitle>
            </DialogHeader>

            {selectedReview && (
              <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
                {/* Info */}
                <div className="grid gap-2 rounded-lg bg-slate-50 p-3 text-sm md:grid-cols-2">
                  <div><span className="font-semibold">Respondente:</span> {selectedReview.respondent_name}</div>
                  <div><span className="font-semibold">Campanha:</span> {selectedReview.campaign_name}</div>
                  <div><span className="font-semibold">NPS:</span> {selectedReview.nps_score ?? '—'}</div>
                  <div><span className="font-semibold">Sentimento:</span> {selectedReview.sentiment ?? '—'}</div>
                </div>

                {/* Summary */}
                {selectedReview.summary_text && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Resumo da Entrevista</label>
                    <div className="rounded-lg bg-slate-50 p-3 text-sm">{selectedReview.summary_text}</div>
                  </div>
                )}

                {/* Transcription */}
                {selectedReview.transcription_text && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Transcrição do Áudio</label>
                    <div className="max-h-48 overflow-y-auto rounded-lg bg-slate-50 p-3 text-sm">
                      {selectedReview.transcription_text}
                    </div>
                  </div>
                )}

                {/* Score */}
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Score (0-10)</label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      placeholder="Score de qualidade"
                      value={reviewScore}
                      onChange={(e) => setReviewScore(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Status Atual</label>
                    <div className="flex h-10 items-center">{statusBadge(selectedReview.review_status)}</div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Observações</label>
                  <Textarea
                    rows={3}
                    placeholder="Notas sobre a revisão..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowDetail(false)}>Cancelar</Button>
              {selectedReview?.review_status === 'pending' && (
                <>
                  <Button
                    variant="danger"
                    onClick={() => rejectMutation.mutate(selectedReview.id)}
                    disabled={rejectMutation.isPending}
                  >
                    Rejeitar
                  </Button>
                  <Button
                    onClick={() => approveMutation.mutate(selectedReview.id)}
                    disabled={approveMutation.isPending}
                  >
                    Aprovar
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
}
