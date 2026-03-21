'use client';

import type { Question } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { AnswerInputFactory } from '@/components/survey/answer-input-factory';

interface QuestionRendererProps {
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function QuestionRenderer({ question, value, onChange }: QuestionRendererProps) {
  return (
    <Card>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-base font-semibold text-slate-800">{question.label}</h3>
        {question.required ? <span className="text-xs text-red-600">*</span> : null}
      </div>
      <AnswerInputFactory question={question} value={value} onChange={onChange} />
    </Card>
  );
}
