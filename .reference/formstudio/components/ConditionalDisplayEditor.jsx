import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff } from 'lucide-react';

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Does not equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_empty', label: 'Is not empty' },
  { value: 'empty', label: 'Is empty' },
  { value: 'greater_than', label: 'Greater than' },
  { value: 'less_than', label: 'Less than' },
];

export default function ConditionalDisplayEditor({ field, condition, onChange, allFields = [] }) {
  const isEnabled = !!condition?.dependsOn;
  const otherFields = allFields.filter(f => f.id !== field.id);

  const handleToggle = (enabled) => {
    if (enabled && otherFields.length > 0) {
      onChange({
        dependsOn: otherFields[0].name,
        operator: 'equals',
        value: ''
      });
    } else {
      onChange(null);
    }
  };

  const handleUpdate = (updates) => {
    onChange({ ...condition, ...updates });
  };

  const needsValue = condition?.operator && !['not_empty', 'empty'].includes(condition.operator);
  const dependentField = otherFields.find(f => f.name === condition?.dependsOn);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            {isEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            Conditional Display
          </span>
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={otherFields.length === 0}
          />
        </CardTitle>
      </CardHeader>

      {otherFields.length === 0 ? (
        <CardContent>
          <p className="text-xs text-muted-foreground text-center py-2">
            Add more fields to the form to use conditional display
          </p>
        </CardContent>
      ) : isEnabled && (
        <CardContent className="space-y-4">
          <div>
            <Label>Show this field when</Label>
            <Select
              value={condition?.dependsOn || ''}
              onValueChange={(v) => handleUpdate({ dependsOn: v })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a field" />
              </SelectTrigger>
              <SelectContent>
                {otherFields.map(f => (
                  <SelectItem key={f.id} value={f.name}>
                    {f.label} <span className="text-muted-foreground">({f.name})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Operator</Label>
            <Select
              value={condition?.operator || 'equals'}
              onValueChange={(v) => handleUpdate({ operator: v })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATORS.map(op => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsValue && (
            <div>
              <Label>Value</Label>
              {dependentField?.type === 'select' || dependentField?.type === 'radio' ? (
                <Select
                  value={condition?.value || ''}
                  onValueChange={(v) => handleUpdate({ value: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a value" />
                  </SelectTrigger>
                  <SelectContent>
                    {(dependentField.options || []).map((opt, idx) => {
                      const optValue = typeof opt === 'string' ? opt : opt.value;
                      const optLabel = typeof opt === 'string' ? opt : opt.label;
                      return (
                        <SelectItem key={idx} value={optValue}>{optLabel}</SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : dependentField?.type === 'checkbox' || dependentField?.type === 'switch' ? (
                <Select
                  value={String(condition?.value || '')}
                  onValueChange={(v) => handleUpdate({ value: v === 'true' })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">True (checked)</SelectItem>
                    <SelectItem value="false">False (unchecked)</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={condition?.value || ''}
                  onChange={(e) => handleUpdate({ value: e.target.value })}
                  placeholder="Enter the value"
                  className="mt-1"
                  type={dependentField?.type === 'number' ? 'number' : 'text'}
                />
              )}
            </div>
          )}

          {condition?.dependsOn && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground">
                <strong>Summary:</strong> This field will be displayed when{' '}
                <Badge variant="outline" className="mx-1">{dependentField?.label || condition.dependsOn}</Badge>
                {' '}{OPERATORS.find(o => o.value === condition.operator)?.label.toLowerCase()}
                {needsValue && (
                  <>
                    {' '}<Badge variant="secondary" className="mx-1">{String(condition.value)}</Badge>
                  </>
                )}
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
