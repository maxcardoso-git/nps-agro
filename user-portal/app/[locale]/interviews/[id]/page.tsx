'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth/auth-context';
import type { Question } from '@/lib/types';

export default function InterviewFlowPage() {
  const t = useTranslations('interviewer.interview');
  const { session } = useAuth();
  const router = useRouter();
  const params = useParams();
  const interviewId = params.id as string;
  const locale = params.locale as string;

  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [answer, setAnswer] = useState<unknown>(undefined);
  const [error, setError] = useState<string | null>(null);

  // Load current state
  const stateQuery = useQuery({
    queryKey: ['interview-state', interviewId],
    queryFn: async () => {
      const result = await api.interviews.next(session!, interviewId, session!.user.tenant_id);
      setCurrentQuestion(result.next_question);
      setProgress(result.interview_state.progress);
      setCompleted(result.interview_state.completed);
      setCampaignId(result.interview_state.campaign_id);
      return result;
    },
    enabled: Boolean(session && interviewId),
  });

  // Submit answer
  const answerMutation = useMutation({
    mutationFn: async () => {
      if (!currentQuestion) throw new Error('No question');
      const result = await api.interviews.answer(session!, interviewId, {
        tenant_id: session!.user.tenant_id,
        question_id: currentQuestion.id,
        value: answer,
      });
      setCurrentQuestion(result.next_question);
      setProgress(result.interview_state.progress);
      setCompleted(result.interview_state.completed);
      setAnswer(undefined);
      setError(null);
      return result;
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('answerError'));
    },
  });

  // Complete interview
  const completeMutation = useMutation({
    mutationFn: () => api.interviews.complete(session!, interviewId, session!.user.tenant_id),
    onSuccess: () => {
      setCompleted(true);
      setCurrentQuestion(null);
      setProgress(100);
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('completeError'));
    },
  });

  const handleSaveExit = useCallback(() => {
    if (campaignId) {
      router.push(`/${locale}/campaigns/${campaignId}`);
    } else {
      router.push(`/${locale}/dashboard`);
    }
  }, [router, locale, campaignId]);

  if (stateQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-slate-400">{t('loading')}</p>
      </div>
    );
  }

  // Completed state
  if (completed && !currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-center">
          <span className="mb-4 inline-flex rounded-full bg-emerald-100 px-4 py-2 text-lg font-medium text-emerald-700">✓</span>
          <h2 className="text-xl font-semibold text-slate-900">{t('completedTitle')}</h2>
          <p className="mt-2 text-sm text-slate-500">{t('completedMessage')}</p>
          <Button className="mt-6" onClick={handleSaveExit}>
            {t('backToCampaign')}
          </Button>
        </div>
      </div>
    );
  }

  const hasAnswer = answer !== undefined && answer !== null && answer !== '';

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" className="text-xs" onClick={handleSaveExit}>
          ← {t('saveExit')}
        </Button>
        <div className="flex-1">
          <div className="h-2 rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <span className="text-xs text-slate-500">{Math.round(progress)}%</span>
      </div>

      {/* Question card */}
      {currentQuestion ? (
        <Card className="p-6">
          <h2 className="mb-1 text-lg font-semibold text-slate-900">{currentQuestion.label}</h2>
          {currentQuestion.required && (
            <span className="text-xs text-red-500">{t('required')}</span>
          )}

          <div className="mt-4">
            <QuestionInput
              question={currentQuestion}
              value={answer}
              onChange={setAnswer}
            />
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-6 flex justify-end">
            <Button
              onClick={() => answerMutation.mutate()}
              disabled={answerMutation.isPending || (!hasAnswer && currentQuestion.required)}
            >
              {answerMutation.isPending ? t('submitting') : t('next')}
            </Button>
          </div>
        </Card>
      ) : !completed ? (
        <Card className="p-6 text-center">
          <p className="mb-4 text-slate-700">{t('allAnswered')}</p>
          <Button
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending}
          >
            {completeMutation.isPending ? t('completing') : t('complete')}
          </Button>
        </Card>
      ) : null}
    </div>
  );
}

// =====================================================
// QUESTION INPUT RENDERER
// =====================================================
function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (question.type) {
    case 'nps': {
      const selected = value as number | undefined;
      return (
        <div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 11 }, (_, i) => (
              <button
                key={i}
                type="button"
                className={[
                  'h-11 w-11 rounded-lg border text-sm font-semibold transition',
                  selected === i
                    ? 'border-primary bg-primary text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-primary',
                ].join(' ')}
                onClick={() => onChange(i)}
              >
                {i}
              </button>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-xs text-slate-400">
            <span>0 — Nada provável</span>
            <span>10 — Muito provável</span>
          </div>
        </div>
      );
    }

    case 'scale': {
      const min = question.scale?.min ?? 1;
      const max = question.scale?.max ?? 5;
      const selected = value as number | undefined;
      return (
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: max - min + 1 }, (_, i) => {
            const n = min + i;
            return (
              <button
                key={n}
                type="button"
                className={[
                  'h-11 w-11 rounded-lg border text-sm font-semibold transition',
                  selected === n
                    ? 'border-primary bg-primary text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-primary',
                ].join(' ')}
                onClick={() => onChange(n)}
              >
                {n}
              </button>
            );
          })}
        </div>
      );
    }

    case 'single_choice':
      return (
        <div className="space-y-2">
          {(question.options ?? []).map((opt) => (
            <label
              key={opt}
              className={[
                'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition',
                value === opt ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300',
              ].join(' ')}
            >
              <input
                type="radio"
                name={question.id}
                value={opt}
                checked={value === opt}
                onChange={() => onChange(opt)}
                className="h-4 w-4 text-primary"
              />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      );

    case 'multi_choice': {
      const selected = (value as string[]) ?? [];
      return (
        <div className="space-y-2">
          {(question.options ?? []).map((opt) => (
            <label
              key={opt}
              className={[
                'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition',
                selected.includes(opt) ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300',
              ].join(' ')}
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={(e) => {
                  if (e.target.checked) onChange([...selected, opt]);
                  else onChange(selected.filter((s) => s !== opt));
                }}
                className="h-4 w-4 rounded text-primary"
              />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      );
    }

    case 'boolean':
      return (
        <div className="flex gap-3">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              className={[
                'flex-1 rounded-lg border p-3 text-sm font-medium transition',
                value === v
                  ? 'border-primary bg-primary text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-primary',
              ].join(' ')}
              onClick={() => onChange(v)}
            >
              {v ? 'Sim' : 'Não'}
            </button>
          ))}
        </div>
      );

    case 'number':
      return (
        <Input
          type="number"
          value={value !== undefined && value !== null ? String(value) : ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
          className="max-w-xs"
        />
      );

    case 'text':
    default:
      return (
        <textarea
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          rows={4}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
        />
      );
  }
}
