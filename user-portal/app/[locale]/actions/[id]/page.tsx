'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth/auth-context';
import type { ContactOutcome, RespondentWithStatus } from '@/lib/types';

const STATUS_TONES: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = {
  pending: 'neutral',
  success: 'success',
  in_progress: 'warning',
  completed: 'success',
  scheduled: 'warning',
  no_answer: 'danger',
  wrong_number: 'danger',
  busy: 'warning',
  refused: 'danger',
  review_pending: 'warning',
};

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'pending', label: 'Pendente' },
  { value: 'success', label: 'Contatado' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluído' },
  { value: 'no_answer', label: 'Não atendeu' },
  { value: 'scheduled', label: 'Agendado' },
  { value: 'wrong_number', label: 'Nº errado' },
  { value: 'busy', label: 'Ocupado' },
  { value: 'refused', label: 'Recusou' },
  { value: 'review_pending', label: 'Em revisão' },
];

const PAGE_SIZE = 30;

export default function ActionContactsPage() {
  const t = useTranslations('interviewer.contacts');
  const { session } = useAuth();
  const router = useRouter();
  const params = useParams();
  const actionId = params.id as string;
  const locale = params.locale as string;
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedRespondent, setSelectedRespondent] = useState<RespondentWithStatus | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [outcome, setOutcome] = useState<ContactOutcome>('success');
  const [notes, setNotes] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [reviewData, setReviewData] = useState<any>(null); // eslint-disable-line
  const [reviewLoading, setReviewLoading] = useState(false);
  const [editingAnswers, setEditingAnswers] = useState<Record<string, string>>({});
  const [savingAnswers, setSavingAnswers] = useState(false);

  // Debounce search
  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const respondentsQuery = useQuery({
    queryKey: ['action-respondents', actionId, debouncedSearch, statusFilter, page],
    queryFn: () =>
      api.actions.getRespondents(session!, actionId, {
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        page,
        page_size: PAGE_SIZE,
      }),
    enabled: Boolean(session && actionId),
  });

  const data = respondentsQuery.data as { items?: RespondentWithStatus[]; total?: number } | RespondentWithStatus[] | undefined;
  const respondents: RespondentWithStatus[] = Array.isArray(data) ? data : (data?.items ?? []);
  const total = Array.isArray(data) ? respondents.length : (data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const contactMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRespondent) throw new Error('No respondent selected');

      const attempt = await api.contactAttempts.createByAction(session!, actionId, selectedRespondent.id, {
        outcome,
        notes: notes || undefined,
        scheduled_at: outcome === 'scheduled' ? scheduledAt : undefined,
      });

      if (outcome === 'success') {
        try {
          const active = await api.interviews.findActive(
            session!,
            selectedRespondent.campaign_id,
            selectedRespondent.id,
          );
          if (active) {
            return { attempt, interviewId: active.id };
          }

          const result = await api.interviews.start(session!, {
            tenant_id: session!.user.tenant_id,
            campaign_id: selectedRespondent.campaign_id,
            action_id: actionId,
            respondent_id: selectedRespondent.id,
            channel: 'manual',
            interviewer_user_id: session!.user.id,
          });
          return { attempt, interviewId: result.interview_state.interview_id };
        } catch (interviewError) {
          console.error('Interview start failed:', interviewError);
          return { attempt, interviewId: null, interviewError: String(interviewError) };
        }
      }

      return { attempt, interviewId: null };
    },
    onSuccess: (result) => {
      setShowModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['action-respondents', actionId] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-callbacks'] });

      if (result.interviewId) {
        router.push(`/${locale}/interviews/${result.interviewId}`);
      } else if ('interviewError' in result && result.interviewError) {
        setError(String(result.interviewError));
      }
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('error'));
    },
  });

  const resetForm = () => {
    setOutcome('success');
    setNotes('');
    setScheduledAt('');
    setError(null);
  };

  const handleNextContact = async () => {
    try {
      const result = await api.actions.nextContact(session!, actionId);
      if (result.contact) {
        openModal(result.contact);
      } else {
        setError(t('noMoreContacts'));
      }
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t('error'));
    }
  };

  const openModal = (respondent: RespondentWithStatus) => {
    setSelectedRespondent(respondent);
    resetForm();
    setShowModal(true);
  };

  const handleResume = async (respondent: RespondentWithStatus) => {
    const active = await api.interviews.findActive(session!, respondent.campaign_id, respondent.id);
    if (active) {
      router.push(`/${locale}/interviews/${active.id}`);
    }
  };

  const handleOpenReview = async (respondent: RespondentWithStatus) => {
    try {
      setReviewLoading(true);
      setShowReview(true);
      setReviewData(null);
      setEditingAnswers({});
      const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
      // Find interview for this respondent (any status)
      const findRes = await fetch(`${API_URL}/interviews/by-respondent?tenant_id=${session!.user.tenant_id}&campaign_id=${respondent.campaign_id}&respondent_id=${respondent.id}`, {
        headers: { 'Authorization': `Bearer ${session!.access_token}`, 'x-tenant-id': session!.user.tenant_id },
      });
      if (!findRes.ok) { setReviewData(null); return; }
      const findBody = await findRes.json();
      const interview = findBody?.data || findBody;
      if (!interview?.id) { setReviewData(null); return; }
      // Get full review
      const res = await fetch(`${API_URL}/interviews/${interview.id}/review`, {
        headers: { 'Authorization': `Bearer ${session!.access_token}`, 'x-tenant-id': session!.user.tenant_id },
      });
      if (res.ok) {
        const body = await res.json();
        setReviewData(body?.data || body);
      }
    } catch { setReviewData(null); } finally { setReviewLoading(false); }
  };

  const handleUploadAudio = async (respondent: RespondentWithStatus, file: File) => {
    try {
      setUploadingId(respondent.id);
      setUploadSuccess(null);
      const active = await api.interviews.findActive(session!, respondent.campaign_id, respondent.id);
      if (!active) {
        setError('Nenhuma entrevista encontrada para este contato');
        return;
      }
      await api.interviews.uploadAudio(session!, active.id, file);
      setUploadSuccess(respondent.id);
      setTimeout(() => setUploadSuccess(null), 3000);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Erro no upload do áudio');
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => router.back()}>
            ← {t('back')}
          </Button>
          <h1 className="text-2xl font-semibold text-slate-900">{t('title')}</h1>
        </div>
        <Button onClick={handleNextContact} className="gap-1">
          {t('nextContact')}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button type="button" className="ml-2 underline" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Search + Filter */}
      <div className="space-y-2">
        <Input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar por nome, código, conta ou telefone..."
        />
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-full md:w-56">
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
      </div>

      {/* Total count */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{total} contato{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</span>
        <span>Página {page} de {totalPages}</span>
      </div>

      {respondentsQuery.isLoading ? (
        <p className="text-sm text-slate-400">{t('loading')}</p>
      ) : respondents.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">{t('empty')}</p>
      ) : (
        <Table
          emptyLabel={t('empty')}
          headers={[t('colName'), 'Código', t('colAccount'), t('colPhone'), t('colStatus'), '']}
          rows={respondents.map((r) => [
            <div key={`n-${r.id}`}>
              <span className="font-medium">{r.name}</span>
              {r.job_title && <span className="block text-xs text-slate-400">{r.job_title}</span>}
            </div>,
            <span key={`c-${r.id}`} className="text-xs text-slate-500">{r.external_id || '—'}</span>,
            r.account_name || '—',
            r.phone || '—',
            <div key={`s-${r.id}`} className="flex flex-col items-start gap-1">
              <Badge tone={STATUS_TONES[r.contact_status] ?? 'neutral'}>
                {STATUS_OPTIONS.find((o) => o.value === r.contact_status)?.label || r.contact_status}
              </Badge>
              {(r.contact_status === 'completed' || r.contact_status === 'success' || r.contact_status === 'in_progress' || r.contact_status === 'review_pending') && (
                <span className={`text-[10px] font-medium ${r.has_audio ? 'text-blue-600' : 'text-slate-400'}`}>
                  {r.has_audio ? '🎤 Via áudio' : '✏️ Manual'}
                </span>
              )}
            </div>,
            <div key={`a-${r.id}`} className="flex items-center gap-1">
              {r.contact_status === 'in_progress' ? (
                <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleResume(r)}>
                  {t('resume')}
                </Button>
              ) : r.contact_status !== 'completed' && r.contact_status !== 'review_pending' ? (
                <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => openModal(r)}>
                  {t('contact')}
                </Button>
              ) : null}
              {(r.contact_status === 'completed' || r.contact_status === 'in_progress' || r.contact_status === 'success' || r.contact_status === 'review_pending') && (
                <>
                  {r.has_audio && (
                    <button
                      onClick={() => r.audio_processed ? handleOpenReview(r) : undefined}
                      className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${r.audio_processed ? 'cursor-pointer bg-green-100 text-green-700 hover:bg-green-200' : 'bg-amber-100 text-amber-700'}`}
                      title={r.audio_processed ? 'Ver transcrição e respostas' : 'Processando áudio...'}
                    >
                      {r.audio_processed ? '✓' : '⏳'}
                      {r.audio_confidence != null && (
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${Number(r.audio_confidence) >= 0.8 ? 'bg-green-200 text-green-800' : Number(r.audio_confidence) >= 0.5 ? 'bg-amber-200 text-amber-800' : 'bg-red-200 text-red-800'}`}>
                          {Math.round(Number(r.audio_confidence) * 100)}%
                        </span>
                      )}
                      {(r as any).adherence_score != null && (
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${Number((r as any).adherence_score) >= 80 ? 'bg-indigo-200 text-indigo-800' : Number((r as any).adherence_score) >= 60 ? 'bg-amber-200 text-amber-800' : 'bg-red-200 text-red-800'}`} title="Aderência ao roteiro">
                          📏{Math.round(Number((r as any).adherence_score))}%
                        </span>
                      )}
                    </button>
                  )}
                  <label className={`cursor-pointer rounded px-2 py-1 text-xs font-medium transition ${uploadSuccess === r.id ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} title="Enviar áudio">
                    {uploadingId === r.id ? '...' : uploadSuccess === r.id ? '✓' : '🎤'}
                    <input
                      type="file"
                      accept="audio/*,video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadAudio(r, file);
                        e.target.value = '';
                      }}
                      disabled={uploadingId === r.id}
                    />
                  </label>
                </>
              )}
            </div>,
          ])}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            className="h-8 px-3 text-xs"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Anterior
          </Button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
            if (p < 1 || p > totalPages) return null;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`h-8 w-8 rounded text-xs font-medium ${p === page ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {p}
              </button>
            );
          })}
          <Button
            variant="ghost"
            className="h-8 px-3 text-xs"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima →
          </Button>
        </div>
      )}

      {/* Review Modal */}
      <Modal open={showReview} onClose={() => setShowReview(false)} title="Transcrição e Respostas">
        {reviewLoading ? (
          <p className="py-8 text-center text-sm text-slate-400">Carregando...</p>
        ) : reviewData ? (
          <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
            {/* Info header */}
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <div className="grid gap-2 md:grid-cols-2">
                <div><span className="font-semibold text-slate-500">Campanha:</span> {reviewData.campaign_name || '—'}</div>
                {reviewData.action_name && <div><span className="font-semibold text-slate-500">Ação:</span> {reviewData.action_name}</div>}
                <div><span className="font-semibold text-slate-500">Entrevistado:</span> {reviewData.respondent_name || '—'}</div>
                <div><span className="font-semibold text-slate-500">Código:</span> {reviewData.external_id || '—'}</div>
              </div>
              {/* Confidence indicator */}
              {reviewData.answers?.length > 0 && (() => {
                const withConf = reviewData.answers.filter((a: { confidence_score: string | number | null }) => a.confidence_score != null);
                if (withConf.length === 0) return null;
                const avg = withConf.reduce((s: number, a: { confidence_score: string | number }) => s + Number(a.confidence_score), 0) / withConf.length;
                const pct = Math.round(avg * 100);
                return (
                  <div className="mt-3 flex items-center gap-3 border-t border-slate-200 pt-3">
                    <span className="text-xs font-semibold text-slate-500">Correspondência:</span>
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-slate-200">
                        <div className={`h-2 rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{pct}%</span>
                  </div>
                );
              })()}
            </div>

            {/* Adherence indicator */}
            {reviewData.audio?.adherence_score != null && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs text-indigo-600">📏</span>
                  Aderência ao Roteiro
                </h3>
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1">
                      <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
                        <div className={`h-full rounded-full ${Number(reviewData.audio.adherence_score) >= 80 ? 'bg-green-500' : Number(reviewData.audio.adherence_score) >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${reviewData.audio.adherence_score}%` }} />
                      </div>
                    </div>
                    <span className={`text-lg font-bold ${Number(reviewData.audio.adherence_score) >= 80 ? 'text-green-600' : Number(reviewData.audio.adherence_score) >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                      {Math.round(Number(reviewData.audio.adherence_score))}%
                    </span>
                  </div>
                  {reviewData.audio.adherence_details && Array.isArray(reviewData.audio.adherence_details) && (
                    <div className="space-y-1">
                      {reviewData.audio.adherence_details.map((d: { question_id: string; asked: boolean; followed_script: boolean; notes: string }, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className={`h-2 w-2 rounded-full ${d.asked && d.followed_script ? 'bg-green-500' : d.asked ? 'bg-amber-500' : 'bg-red-500'}`} />
                          <span className="flex-1 text-slate-600">{d.question_id}</span>
                          <span className={d.asked ? 'text-green-600' : 'text-red-600'}>{d.asked ? 'Perguntou' : 'Não perguntou'}</span>
                          {d.asked && <span className={d.followed_script ? 'text-green-600' : 'text-amber-600'}>{d.followed_script ? '✓ Roteiro' : '~ Adaptou'}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Transcription */}
            {reviewData.audio?.transcription_text && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs text-blue-600">🎤</span>
                  Transcrição do Áudio
                </h3>
                <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 text-sm">
                  {(() => {
                    const text = reviewData.audio.transcription_text as string;
                    // Split into sentences
                    const sentences = text.split(/(?<=[.?!])\s+/).filter((s: string) => s.trim());
                    const turns: Array<{ speaker: string; text: string }> = [];
                    let currentTurn: { speaker: string; text: string } = { speaker: 'interviewer', text: '' };

                    for (const sentence of sentences) {
                      const s = sentence.trim();
                      // Heuristics: interviewer asks questions, introduces themselves, reads options
                      const isQuestion = /\?$/.test(s);
                      const isIntro = /meu nome|falo por parte|em nome da|estamos|ligando|realizando|precisaria/i.test(s);
                      const isReadingOptions = /escala de|onde \d|ler as opções|numa escala|em uma escala/i.test(s);
                      const isShortAnswer = s.split(' ').length <= 5 && !isQuestion;
                      const isAgreement = /^(sim|não|ok|perfeito|isso|exato|correto|certo|claro|uhum|obrigad)/i.test(s);

                      let speaker: string;
                      if (isIntro || isReadingOptions) {
                        speaker = 'interviewer';
                      } else if (isQuestion) {
                        speaker = 'interviewer';
                      } else if (isShortAnswer && !isIntro) {
                        speaker = currentTurn.speaker === 'interviewer' ? 'respondent' : currentTurn.speaker;
                      } else if (isAgreement && currentTurn.speaker === 'interviewer') {
                        speaker = 'respondent';
                      } else {
                        speaker = currentTurn.speaker;
                      }

                      if (speaker !== currentTurn.speaker && currentTurn.text) {
                        turns.push({ ...currentTurn });
                        currentTurn = { speaker, text: s };
                      } else {
                        currentTurn.text += (currentTurn.text ? ' ' : '') + s;
                        currentTurn.speaker = speaker;
                      }
                    }
                    if (currentTurn.text) turns.push(currentTurn);

                    return turns.map((turn, i) => (
                      <div key={i} className={`rounded-lg px-3 py-2 ${turn.speaker === 'interviewer' ? 'bg-blue-50 border-l-2 border-blue-400' : 'bg-green-50 border-l-2 border-green-400'}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${turn.speaker === 'interviewer' ? 'text-blue-600' : 'text-green-600'}`}>
                          {turn.speaker === 'interviewer' ? 'Entrevistador' : 'Entrevistado'}
                        </p>
                        <p className="text-slate-700 leading-relaxed">{turn.text}</p>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* Mapped answers by questionnaire */}
            {reviewData.questionnaire_schema?.questions?.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-600">📋</span>
                  Respostas do Questionário
                </h3>
                <div className="space-y-3">
                  {reviewData.questionnaire_schema.questions.map((q: { id: string; label: string; type: string; options?: string[] }, idx: number) => {
                    const ans = (reviewData.answers || []).find((a: { question_id: string }) => a.question_id === q.id);
                    const value = ans ? (ans.value_text ?? ans.value_numeric ?? ans.value_boolean ?? (ans.value_json ? JSON.stringify(ans.value_json) : null)) : null;
                    const confidence = ans?.confidence_score;
                    const confNum = confidence != null ? Number(confidence) : null;
                    const isEditing = q.id in editingAnswers;
                    const editValue = editingAnswers[q.id] ?? '';

                    return (
                      <div key={q.id} className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-slate-500">Pergunta {idx + 1} · {q.type.toUpperCase()}</p>
                            <p className="mt-0.5 text-sm font-medium text-slate-800">{q.label}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {confNum != null && (
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${confNum >= 0.7 ? 'bg-green-100 text-green-700' : confNum >= 0.4 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                {Math.round(confNum * 100)}%
                              </span>
                            )}
                            <button
                              className="rounded p-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                              onClick={() => {
                                if (isEditing) {
                                  setEditingAnswers((prev) => { const n = { ...prev }; delete n[q.id]; return n; });
                                } else {
                                  setEditingAnswers((prev) => ({ ...prev, [q.id]: value !== null ? String(value) : '' }));
                                }
                              }}
                              title={isEditing ? 'Cancelar edição' : 'Editar resposta'}
                            >
                              {isEditing ? '✕' : '✏️'}
                            </button>
                          </div>
                        </div>
                        <div className="mt-2">
                          {isEditing ? (
                            q.type === 'single_choice' && q.options ? (
                              <select
                                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                                value={editValue}
                                onChange={(e) => setEditingAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                              >
                                <option value="">— Selecione —</option>
                                {q.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                            ) : q.type === 'nps' || q.type === 'scale' || q.type === 'number' ? (
                              <input
                                type="number"
                                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                                value={editValue}
                                onChange={(e) => setEditingAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                              />
                            ) : (
                              <textarea
                                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                                rows={2}
                                value={editValue}
                                onChange={(e) => setEditingAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                              />
                            )
                          ) : (
                            <div className="rounded bg-slate-50 px-3 py-2 text-sm">
                              {value !== null ? (
                                <span className="text-slate-900">{String(value)}</span>
                              ) : (
                                <span className="italic text-slate-400">Sem resposta</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Save edited answers */}
            {Object.keys(editingAnswers).length > 0 && (
              <button
                className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                disabled={savingAnswers}
                onClick={async () => {
                  try {
                    setSavingAnswers(true);
                    const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
                    await fetch(`${API_URL}/interviews/${reviewData.interview_id}/answers`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session!.access_token}`, 'x-tenant-id': session!.user.tenant_id },
                      body: JSON.stringify({ answers: Object.entries(editingAnswers).map(([qid, val]) => ({ question_id: qid, value: val })) }),
                    });
                    setEditingAnswers({});
                    // Reload review data
                    const res = await fetch(`${API_URL}/interviews/${reviewData.interview_id}/review`, {
                      headers: { 'Authorization': `Bearer ${session!.access_token}`, 'x-tenant-id': session!.user.tenant_id },
                    });
                    if (res.ok) { const body = await res.json(); setReviewData(body?.data || body); }
                    queryClient.invalidateQueries({ queryKey: ['action-respondents'] });
                  } catch { setError('Erro ao salvar respostas'); } finally { setSavingAnswers(false); }
                }}
              >
                {savingAnswers ? 'Salvando...' : `Salvar ${Object.keys(editingAnswers).length} alteração(ões)`}
              </button>
            )}

            {/* Enrichment */}
            {reviewData.enrichment && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-xs text-purple-600">🧠</span>
                  Análise IA
                </h3>
                <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm md:grid-cols-3">
                  <div><span className="font-semibold text-slate-500">NPS:</span> <span className="text-lg font-bold">{reviewData.enrichment.nps_score ?? '—'}</span></div>
                  <div><span className="font-semibold text-slate-500">Classe:</span> {reviewData.enrichment.nps_class ?? '—'}</div>
                  <div><span className="font-semibold text-slate-500">Sentimento:</span> {reviewData.enrichment.sentiment ?? '—'}</div>
                </div>
                {reviewData.enrichment.summary_text && (
                  <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    {reviewData.enrichment.summary_text}
                  </div>
                )}
              </div>
            )}

            {/* Processing times */}
            {reviewData.processing?.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs text-slate-600">⏱</span>
                  Tempo de Processamento
                </h3>
                <div className="flex flex-wrap gap-2">
                  {reviewData.processing.map((job: { job_type: string; status: string; duration_seconds: number | null }, i: number) => {
                    const labels: Record<string, string> = {
                      audio_transcription: '🎤 Transcrição',
                      answer_extraction: '📋 Extração',
                      ai_enrichment: '🧠 Enrichment',
                    };
                    const duration = job.duration_seconds;
                    const formatted = duration != null
                      ? duration >= 60 ? `${Math.floor(duration / 60)}m ${Math.round(duration % 60)}s` : `${Math.round(duration)}s`
                      : '—';
                    return (
                      <div key={i} className={`rounded-lg border px-3 py-2 text-xs ${job.status === 'completed' ? 'border-green-200 bg-green-50' : job.status === 'failed' ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
                        <span className="font-medium">{labels[job.job_type] || job.job_type}</span>
                        <span className="ml-2 font-bold">{formatted}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-slate-400">Nenhum dado disponível</p>
        )}
      </Modal>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={t('attemptTitle')}>
        {selectedRespondent && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="font-medium text-slate-900">{selectedRespondent.name}</p>
              <p className="text-sm text-slate-500">{selectedRespondent.phone || '—'}</p>
              {selectedRespondent.external_id && (
                <p className="text-xs text-slate-400">Código: {selectedRespondent.external_id}</p>
              )}
              {selectedRespondent.account_name && (
                <p className="text-xs text-slate-400">{selectedRespondent.account_name}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('outcome')}</label>
              <Select value={outcome} onChange={(e) => setOutcome(e.target.value as ContactOutcome)}>
                <option value="success">{t('outcomes.success')}</option>
                <option value="no_answer">{t('outcomes.no_answer')}</option>
                <option value="wrong_number">{t('outcomes.wrong_number')}</option>
                <option value="busy">{t('outcomes.busy')}</option>
                <option value="scheduled">{t('outcomes.scheduled')}</option>
                <option value="refused">{t('outcomes.refused')}</option>
              </Select>
            </div>

            {outcome === 'scheduled' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{t('scheduleDate')}</label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('notes')}</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('notesPlaceholder')} />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowModal(false)}>{t('cancel')}</Button>
              <Button
                onClick={() => contactMutation.mutate()}
                disabled={contactMutation.isPending || (outcome === 'scheduled' && !scheduledAt)}
              >
                {contactMutation.isPending ? t('saving') : t('save')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
