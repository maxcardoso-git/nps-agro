'use client';

import type { Question } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface AnswerInputFactoryProps {
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function AnswerInputFactory({ question, value, onChange }: AnswerInputFactoryProps) {
  switch (question.type) {
    case 'nps':
      return (
        <Input
          type="number"
          min={0}
          max={10}
          value={typeof value === 'number' ? value : ''}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      );

    case 'scale':
      return (
        <Input
          type="number"
          min={question.scale?.min}
          max={question.scale?.max}
          value={typeof value === 'number' ? value : ''}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      );

    case 'single_choice':
      return (
        <Select value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value)}>
          <option value="">-</option>
          {(question.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      );

    case 'multi_choice': {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-2">
          {(question.options || []).map((option) => {
            const checked = selected.includes(option);
            return (
              <label key={option} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    if (event.target.checked) {
                      onChange([...selected, option]);
                    } else {
                      onChange(selected.filter((item) => item !== option));
                    }
                  }}
                />
                {option}
              </label>
            );
          })}
        </div>
      );
    }

    case 'boolean':
      return (
        <Select
          value={typeof value === 'boolean' ? String(value) : ''}
          onChange={(event) => {
            if (event.target.value === '') {
              onChange(undefined);
            } else {
              onChange(event.target.value === 'true');
            }
          }}
        >
          <option value="">-</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </Select>
      );

    case 'number':
      return (
        <Input
          type="number"
          value={typeof value === 'number' ? value : ''}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      );

    case 'text':
    default:
      return (
        <Textarea
          rows={4}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
        />
      );
  }
}
