'use client';

import { useTranslations } from 'next-intl';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { DisplayCondition } from '@/lib/types';
import type { EditorField } from './types';

const OPERATORS: { value: DisplayCondition['operator']; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not equals' },
  { value: 'gt', label: 'Greater than' },
  { value: 'gte', label: 'Greater or equal' },
  { value: 'lt', label: 'Less than' },
  { value: 'lte', label: 'Less or equal' },
  { value: 'in', label: 'In list' },
  { value: 'not_in', label: 'Not in list' },
];

interface ConditionalDisplayEditorProps {
  field: EditorField;
  allFields: EditorField[];
  onChange: (condition: DisplayCondition | undefined) => void;
}

export function ConditionalDisplayEditor({ field, allFields, onChange }: ConditionalDisplayEditorProps) {
  const t = useTranslations('formStudio.conditions');
  const condition = field.display_condition;
  const enabled = Boolean(condition);

  const availableFields = allFields.filter(
    (f) => f.id !== field.id && f.type !== 'section'
  );

  const handleToggle = (checked: boolean) => {
    if (checked && availableFields.length > 0) {
      onChange({
        question_id: availableFields[0].id,
        operator: 'equals',
        value: '',
      });
    } else {
      onChange(undefined);
    }
  };

  if (availableFields.length === 0) {
    return <p className="text-xs text-slate-400">{t('noFields')}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{t('enable')}</Label>
        <Switch checked={enabled} onCheckedChange={handleToggle} />
      </div>

      {condition && (
        <>
          <div>
            <Label className="text-xs">{t('dependsOn')}</Label>
            <Select
              value={condition.question_id}
              onChange={(e) =>
                onChange({ ...condition, question_id: e.target.value })
              }
              className="mt-1"
            >
              {availableFields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label className="text-xs">{t('operator')}</Label>
            <Select
              value={condition.operator}
              onChange={(e) =>
                onChange({ ...condition, operator: e.target.value as DisplayCondition['operator'] })
              }
              className="mt-1"
            >
              {OPERATORS.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label className="text-xs">{t('value')}</Label>
            <ValueInput
              condition={condition}
              dependsOnField={allFields.find((f) => f.id === condition.question_id)}
              onChange={(value) => onChange({ ...condition, value })}
            />
          </div>
        </>
      )}
    </div>
  );
}

function ValueInput({
  condition,
  dependsOnField,
  onChange,
}: {
  condition: DisplayCondition;
  dependsOnField: EditorField | undefined;
  onChange: (value: unknown) => void;
}) {
  if (!dependsOnField) {
    return <Input value={String(condition.value ?? '')} onChange={(e) => onChange(e.target.value)} className="mt-1" />;
  }

  // For choice fields, show options as select
  if (
    (dependsOnField.type === 'single_choice' || dependsOnField.type === 'multi_choice') &&
    dependsOnField.options?.length
  ) {
    return (
      <Select
        value={String(condition.value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1"
      >
        <option value="">—</option>
        {dependsOnField.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </Select>
    );
  }

  // For boolean, show switch
  if (dependsOnField.type === 'boolean') {
    return (
      <div className="mt-1">
        <Switch
          checked={Boolean(condition.value)}
          onCheckedChange={(v) => onChange(v)}
        />
      </div>
    );
  }

  // For numbers
  if (dependsOnField.type === 'number' || dependsOnField.type === 'nps' || dependsOnField.type === 'scale') {
    return (
      <Input
        type="number"
        value={condition.value !== undefined && condition.value !== null ? String(condition.value) : ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
        className="mt-1"
      />
    );
  }

  // Default: text input
  return (
    <Input
      value={String(condition.value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1"
    />
  );
}
