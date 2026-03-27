import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, AlertTriangle, Info } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const VALIDATION_TYPES = {
  pattern: {
    label: 'Pattern (Regex)',
    description: 'Validate using regular expression',
    fields: ['pattern', 'message'],
    examples: [
      { pattern: '^[A-Z]{2}\\d{4}$', desc: 'Code: 2 letters + 4 numbers (AB1234)' },
      { pattern: '^\\d{3}-\\d{2}-\\d{4}$', desc: 'SSN format (xxx-xx-xxxx)' },
      { pattern: '^[a-zA-Z0-9_]+$', desc: 'Only letters, numbers and underscore' },
    ]
  },
  minValue: {
    label: 'Minimum Value',
    description: 'Minimum numeric value allowed',
    fields: ['value', 'message'],
    forTypes: ['number']
  },
  maxValue: {
    label: 'Maximum Value',
    description: 'Maximum numeric value allowed',
    fields: ['value', 'message'],
    forTypes: ['number']
  },
  minLength: {
    label: 'Minimum Length',
    description: 'Minimum number of characters',
    fields: ['value', 'message'],
    forTypes: ['text', 'textarea']
  },
  maxLength: {
    label: 'Maximum Length',
    description: 'Maximum number of characters',
    fields: ['value', 'message'],
    forTypes: ['text', 'textarea']
  },
  custom: {
    label: 'Custom Expression',
    description: 'Validation with JavaScript expression',
    fields: ['expression', 'message'],
    examples: [
      { expression: 'value.startsWith("US")', desc: 'Must start with US' },
      { expression: 'value.length % 2 === 0', desc: 'Length must be even' },
      { expression: 'allValues.confirm === value', desc: 'Must match another field' },
    ]
  }
};

export default function ValidationRulesEditor({ field, rules = [], onChange, allFields = [] }) {
  const [expandedRule, setExpandedRule] = useState(null);

  const availableTypes = Object.entries(VALIDATION_TYPES)
    .filter(([key, config]) => {
      if (!config.forTypes) return true;
      return config.forTypes.includes(field.type);
    })
    .map(([key, config]) => ({ key, ...config }));

  const handleAddRule = () => {
    const defaultType = availableTypes[0]?.key || 'pattern';
    const newRule = {
      id: `rule_${Date.now()}`,
      type: defaultType,
      pattern: '',
      value: '',
      expression: '',
      message: ''
    };
    onChange([...rules, newRule]);
    setExpandedRule(newRule.id);
  };

  const handleUpdateRule = (ruleId, updates) => {
    onChange(rules.map(r => r.id === ruleId ? { ...r, ...updates } : r));
  };

  const handleDeleteRule = (ruleId) => {
    onChange(rules.filter(r => r.id !== ruleId));
  };

  const renderRuleFields = (rule) => {
    const typeConfig = VALIDATION_TYPES[rule.type];
    if (!typeConfig) return null;

    return (
      <div className="space-y-4 pt-4">
        {typeConfig.fields.includes('pattern') && (
          <div>
            <Label className="flex items-center gap-2">
              Pattern (Regex)
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>JavaScript regular expression. Use \\ to escape special characters.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              value={rule.pattern || ''}
              onChange={(e) => handleUpdateRule(rule.id, { pattern: e.target.value })}
              placeholder="^[A-Z]{2}\\d{4}$"
              className="mt-1 font-mono text-sm"
            />
            {typeConfig.examples && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-muted-foreground">Examples:</p>
                {typeConfig.examples.map((ex, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="block text-xs text-primary hover:underline text-left"
                    onClick={() => handleUpdateRule(rule.id, { pattern: ex.pattern })}
                  >
                    <code className="bg-muted px-1 rounded">{ex.pattern}</code> - {ex.desc}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {typeConfig.fields.includes('value') && (
          <div>
            <Label>Value</Label>
            <Input
              type="number"
              value={rule.value || ''}
              onChange={(e) => handleUpdateRule(rule.id, { value: e.target.value ? parseFloat(e.target.value) : '' })}
              className="mt-1"
            />
          </div>
        )}

        {typeConfig.fields.includes('expression') && (
          <div>
            <Label className="flex items-center gap-2">
              JavaScript Expression
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Available variables: <code>value</code> (current value), <code>field</code> (field config), <code>allValues</code> (all values)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Textarea
              value={rule.expression || ''}
              onChange={(e) => handleUpdateRule(rule.id, { expression: e.target.value })}
              placeholder="value.length > 5 && value.includes('@')"
              className="mt-1 font-mono text-sm"
              rows={2}
            />
            {typeConfig.examples && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-muted-foreground">Examples:</p>
                {typeConfig.examples.map((ex, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="block text-xs text-primary hover:underline text-left"
                    onClick={() => handleUpdateRule(rule.id, { expression: ex.expression })}
                  >
                    <code className="bg-muted px-1 rounded">{ex.expression}</code> - {ex.desc}
                  </button>
                ))}
              </div>
            )}
            {allFields.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">Available fields in allValues:</p>
                <div className="flex flex-wrap gap-1">
                  {allFields.filter(f => f.id !== field.id).map(f => (
                    <Badge key={f.id} variant="outline" className="text-xs font-mono">
                      {f.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <Label>Error Message</Label>
          <Input
            value={rule.message || ''}
            onChange={(e) => handleUpdateRule(rule.id, { message: e.target.value })}
            placeholder="Invalid format"
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Leave empty to use default message
          </p>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Validation Rules</span>
          <Badge variant="secondary">{rules.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rules.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No rules configured</p>
            <p className="text-xs">Add rules for advanced validation</p>
          </div>
        ) : (
          <Accordion type="single" collapsible value={expandedRule} onValueChange={setExpandedRule}>
            {rules.map((rule, index) => {
              const typeConfig = VALIDATION_TYPES[rule.type];
              return (
                <AccordionItem key={rule.id} value={rule.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{index + 1}</Badge>
                      <span>{typeConfig?.label || rule.type}</span>
                      {rule.message && (
                        <span className="text-xs text-muted-foreground truncate max-w-32">
                          - {rule.message}
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <div>
                        <Label>Validation Type</Label>
                        <Select
                          value={rule.type}
                          onValueChange={(v) => handleUpdateRule(rule.id, { type: v })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableTypes.map(t => (
                              <SelectItem key={t.key} value={t.key}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {typeConfig?.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {typeConfig.description}
                          </p>
                        )}
                      </div>

                      {renderRuleFields(rule)}

                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="w-full"
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Remove Rule
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddRule}
          className="w-full"
        >
          <Plus className="h-3 w-3 mr-2" />
          Add Rule
        </Button>
      </CardContent>
    </Card>
  );
}
