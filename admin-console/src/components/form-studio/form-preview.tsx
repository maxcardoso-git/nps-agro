'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { EditorField } from './types';
import type { DisplayCondition } from '@/lib/types';

interface FormPreviewProps {
  fields: EditorField[];
  formName: string;
}

export function FormPreview({ fields, formName }: FormPreviewProps) {
  const t = useTranslations('formStudio.preview');
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const setValue = useCallback((fieldId: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[fieldId];
      return copy;
    });
  }, []);

  const isFieldVisible = useCallback(
    (field: EditorField): boolean => {
      if (!field.display_condition) return true;
      const cond: DisplayCondition = field.display_condition;
      const depValue = values[cond.question_id];
      switch (cond.operator) {
        case 'equals':
          return depValue === cond.value;
        case 'not_equals':
          return depValue !== cond.value;
        case 'gt':
          return Number(depValue) > Number(cond.value);
        case 'gte':
          return Number(depValue) >= Number(cond.value);
        case 'lt':
          return Number(depValue) < Number(cond.value);
        case 'lte':
          return Number(depValue) <= Number(cond.value);
        case 'in':
          return Array.isArray(cond.value) && cond.value.includes(depValue);
        case 'not_in':
          return Array.isArray(cond.value) && !cond.value.includes(depValue);
        default:
          return true;
      }
    },
    [values]
  );

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    for (const field of fields) {
      if (field.type === 'section') continue;
      if (!isFieldVisible(field)) continue;
      if (field.required) {
        const v = values[field.id];
        if (v === undefined || v === null || v === '') {
          newErrors[field.id] = t('required');
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [fields, values, isFieldVisible, t]);

  const handleSubmit = () => {
    if (validate()) {
      setSubmitted(true);
    }
  };

  const handleReset = () => {
    setValues({});
    setErrors({});
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>{t('submitSuccess')}</AlertDescription>
        </Alert>
        <pre className="max-h-60 overflow-auto rounded-lg bg-slate-50 p-3 text-xs">
          {JSON.stringify(values, null, 2)}
        </pre>
        <Button variant="ghost" onClick={handleReset}>
          {t('reset')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-slate-700">{formName}</p>

      {fields.map((field) => {
        if (!isFieldVisible(field)) return null;

        if (field.type === 'section') {
          return (
            <div key={field.id} className="border-b border-slate-200 pb-1 pt-3">
              <h3 className="text-sm font-semibold text-slate-800">{field.label}</h3>
            </div>
          );
        }

        const err = errors[field.id];

        return (
          <div key={field.id} className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              {field.label}
              {field.required && <span className="ml-1 text-red-500">*</span>}
            </label>
            {field.description && (
              <p className="text-xs text-slate-400">{field.description}</p>
            )}
            <FieldRenderer field={field} value={values[field.id]} onChange={(v) => setValue(field.id, v)} />
            {err && <p className="text-xs text-red-600">{err}</p>}
          </div>
        );
      })}

      <div className="flex gap-2 pt-2">
        <Button onClick={handleSubmit}>{t('submit')}</Button>
        <Button variant="ghost" onClick={handleReset}>{t('reset')}</Button>
      </div>
    </div>
  );
}

// =====================================================
// FIELD RENDERER
// =====================================================
function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: EditorField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (field.type) {
    case 'nps': {
      const selected = value as number | undefined;
      return (
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 11 }, (_, i) => (
            <button
              key={i}
              type="button"
              className={[
                'h-9 w-9 rounded-lg border text-sm font-medium transition',
                selected === i
                  ? 'border-primary bg-primary text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-primary',
              ].join(' ')}
              onClick={() => onChange(i)}
            >
              {i}
            </button>
          ))}
          <div className="flex w-full justify-between text-xs text-slate-400 mt-1">
            <span>Not likely</span>
            <span>Very likely</span>
          </div>
        </div>
      );
    }

    case 'scale': {
      const min = field.scale?.min ?? 1;
      const max = field.scale?.max ?? 5;
      const selected = value as number | undefined;
      const count = max - min + 1;
      return (
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: count }, (_, i) => {
            const n = min + i;
            return (
              <button
                key={n}
                type="button"
                className={[
                  'h-9 w-9 rounded-lg border text-sm font-medium transition',
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

    case 'text':
      return (
        <Textarea
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field._placeholder}
          rows={3}
        />
      );

    case 'number':
      return (
        <Input
          type="number"
          value={value !== undefined && value !== null ? String(value) : ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
          min={field._min}
          max={field._max}
        />
      );

    case 'single_choice':
      return (
        <div className="space-y-1">
          {(field.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={field.id}
                value={opt}
                checked={value === opt}
                onChange={() => onChange(opt)}
                className="h-4 w-4 text-primary"
              />
              {opt}
            </label>
          ))}
        </div>
      );

    case 'multi_choice': {
      const selected = (value as string[]) ?? [];
      return (
        <div className="space-y-1">
          {(field.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={(e) => {
                  if (e.target.checked) onChange([...selected, opt]);
                  else onChange(selected.filter((s) => s !== opt));
                }}
                className="h-4 w-4 rounded text-primary"
              />
              {opt}
            </label>
          ))}
        </div>
      );
    }

    case 'boolean':
      return (
        <div className="flex items-center gap-3">
          <Switch
            checked={Boolean(value)}
            onCheckedChange={(v) => onChange(v)}
          />
          <span className="text-sm text-slate-600">{value ? 'Yes' : 'No'}</span>
        </div>
      );

    default:
      return <Input value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />;
  }
}
