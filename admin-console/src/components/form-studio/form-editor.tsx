'use client';

import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  Save,
  Eye,
  Undo,
  Trash2,
  GripVertical,
  ArrowLeft,
  Send,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { apiClient, ApiError } from '@/lib/api/client';
import type { AuthSession, Questionnaire, QuestionnaireVersion } from '@/lib/types';
import type { EditorField, EditorFieldType } from './types';
import { schemaToFields, fieldsToSchema, generateFieldId } from './types';
import { QUESTION_TYPES, createField, getFieldTypeDefinition } from './constants';
import { FormPreview } from './form-preview';
import { ConditionalDisplayEditor } from './conditional-display-editor';
import { VersionHistory } from './version-history';

interface FormEditorProps {
  questionnaire: Questionnaire & { versions?: QuestionnaireVersion[] };
  session: AuthSession;
  onBack: () => void;
}

export function FormEditor({ questionnaire, session, onBack }: FormEditorProps) {
  const t = useTranslations('formStudio');
  const queryClient = useQueryClient();

  // Find the current draft version (or latest published)
  const versions = questionnaire.versions ?? [];
  const draftVersion = versions.find((v) => v.status === 'draft');
  const latestVersion = versions[0]; // assume sorted by version_number desc

  // Editor state
  const [fields, setFields] = useState<EditorField[]>(() =>
    schemaToFields(draftVersion?.schema_json ?? latestVersion?.schema_json)
  );
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [configTab, setConfigTab] = useState('field');
  const [draftVersionId, setDraftVersionId] = useState<string | null>(draftVersion?.id ?? null);

  // Preview dialog
  const [showPreview, setShowPreview] = useState(false);

  // Publish dialog
  const [showPublishDialog, setShowPublishDialog] = useState(false);

  // Undo history
  const [history, setHistory] = useState<EditorField[][]>([fields]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const selectedField = useMemo(
    () => fields.find((f) => f.id === selectedFieldId) ?? null,
    [fields, selectedFieldId]
  );

  // --- History helpers ---
  const pushHistory = useCallback(
    (newFields: EditorField[]) => {
      setHistory((prev) => {
        const trimmed = prev.slice(0, historyIndex + 1);
        return [...trimmed, newFields];
      });
      setHistoryIndex((i) => i + 1);
    },
    [historyIndex]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    setFields(prev);
    setHistoryIndex((i) => i - 1);
    setIsDirty(true);
  }, [history, historyIndex]);

  // --- Field CRUD ---
  const addField = useCallback(
    (type: EditorFieldType) => {
      const field = createField(type);
      setFields((prev) => {
        const updated = [...prev, field];
        pushHistory(updated);
        return updated;
      });
      setSelectedFieldId(field.id);
      setIsDirty(true);
      setError(null);
    },
    [pushHistory]
  );

  const updateField = useCallback(
    (fieldId: string, updates: Partial<EditorField>) => {
      setFields((prev) => {
        const updated = prev.map((f) => (f.id === fieldId ? { ...f, ...updates } : f));
        pushHistory(updated);
        return updated;
      });
      setIsDirty(true);
    },
    [pushHistory]
  );

  const deleteField = useCallback(
    (fieldId: string) => {
      setFields((prev) => {
        const updated = prev.filter((f) => f.id !== fieldId);
        pushHistory(updated);
        return updated;
      });
      if (selectedFieldId === fieldId) setSelectedFieldId(null);
      setIsDirty(true);
    },
    [selectedFieldId, pushHistory]
  );

  // --- Drag & Drop ---
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    (e.currentTarget as HTMLElement).style.opacity = '0.5';
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    (e.currentTarget as HTMLElement).style.opacity = '1';
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (draggedIndex !== null && index !== draggedIndex) setDragOverIndex(index);
    },
    [draggedIndex]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault();
      if (draggedIndex !== null && draggedIndex !== toIndex) {
        setFields((prev) => {
          const updated = [...prev];
          const [removed] = updated.splice(draggedIndex, 1);
          updated.splice(toIndex, 0, removed);
          pushHistory(updated);
          return updated;
        });
        setIsDirty(true);
      }
      setDraggedIndex(null);
      setDragOverIndex(null);
    },
    [draggedIndex, pushHistory]
  );

  // --- API mutations ---
  const saveMutation = useMutation({
    mutationFn: async () => {
      const schema_json = fieldsToSchema(fields) as unknown as Record<string, unknown>;
      if (draftVersionId) {
        return apiClient.questionnaires.updateDraftVersion(session, draftVersionId, { schema_json });
      }
      return apiClient.questionnaires.createVersion(session, questionnaire.id, { schema_json });
    },
    onSuccess: (result) => {
      setDraftVersionId(result.id);
      setIsDirty(false);
      setError(null);
      setSuccessMsg(t('editor.saved'));
      queryClient.invalidateQueries({ queryKey: ['questionnaire', questionnaire.id] });
      setTimeout(() => setSuccessMsg(null), 2000);
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('editor.saveError'));
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!draftVersionId) throw new Error('No draft to publish');
      // Validate first
      await apiClient.questionnaires.validateVersion(session, draftVersionId);
      return apiClient.questionnaires.publishVersion(session, draftVersionId);
    },
    onSuccess: () => {
      setShowPublishDialog(false);
      setDraftVersionId(null);
      setIsDirty(false);
      setError(null);
      setSuccessMsg(t('editor.published'));
      queryClient.invalidateQueries({ queryKey: ['questionnaire', questionnaire.id] });
      setTimeout(() => setSuccessMsg(null), 2000);
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('editor.publishError'));
    },
  });

  // --- Status helpers ---
  const statusTone = (s: string) => {
    if (s === 'published') return 'success' as const;
    if (s === 'archived') return 'danger' as const;
    return 'neutral' as const;
  };

  // ===================== RENDER =====================
  return (
    <div className="flex h-[calc(100vh-120px)] flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
        <Button variant="ghost" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          {t('editor.back')}
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-slate-900">{questionnaire.name}</h1>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Badge tone={statusTone(questionnaire.status)}>{questionnaire.status}</Badge>
            {isDirty && <span className="text-amber-600">{t('editor.unsaved')}</span>}
          </div>
        </div>
        <Button variant="ghost" onClick={handleUndo} disabled={historyIndex <= 0} className="gap-1">
          <Undo className="h-4 w-4" />
        </Button>
        <Button variant="ghost" onClick={() => setShowPreview(true)} className="gap-1">
          <Eye className="h-4 w-4" />
          {t('editor.preview')}
        </Button>
        <Button
          variant="primary"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !isDirty}
          className="gap-1"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? t('editor.saving') : t('editor.save')}
        </Button>
        <Button
          variant="secondary"
          onClick={() => setShowPublishDialog(true)}
          disabled={!draftVersionId || isDirty}
          className="gap-1"
        >
          <Send className="h-4 w-4" />
          {t('editor.publish')}
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <Alert variant="destructive" className="mx-4 mt-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {successMsg && (
        <Alert className="mx-4 mt-2">
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      {/* Main 3-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL — Field palette */}
        <div className="w-56 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t('editor.addField')}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {QUESTION_TYPES.map((qt) => {
              const Icon = qt.icon;
              return (
                <button
                  key={qt.type}
                  type="button"
                  className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700 transition hover:border-primary hover:bg-primary/5"
                  onClick={() => addField(qt.type)}
                >
                  <Icon className="h-5 w-5 text-slate-500" />
                  {qt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* CENTER PANEL — Canvas */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-4">
          {fields.length === 0 ? (
            <div className="flex h-full items-center justify-center text-slate-400">
              <div className="text-center">
                <Plus className="mx-auto mb-2 h-10 w-10" />
                <p>{t('editor.emptyCanvas')}</p>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-2xl space-y-2">
              {fields.map((field, index) => {
                const def = getFieldTypeDefinition(field.type);
                const Icon = def?.icon;
                const isSelected = selectedFieldId === field.id;
                const isSection = field.type === 'section';

                return (
                  <div
                    key={field.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={() => setDragOverIndex(null)}
                    onDrop={(e) => handleDrop(e, index)}
                    className={[
                      'group flex cursor-pointer items-center gap-2 rounded-lg border bg-white p-3 transition',
                      isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200 hover:border-slate-300',
                      dragOverIndex === index ? 'border-dashed border-primary' : '',
                      isSection ? 'bg-slate-50 font-semibold' : '',
                    ].join(' ')}
                    onClick={() => setSelectedFieldId(field.id)}
                  >
                    <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-300" />
                    {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-500" />}
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{field.label}</span>
                      {!isSection && (
                        <span className="text-xs text-slate-400">{def?.label}</span>
                      )}
                    </div>
                    {field.required && (
                      <Badge tone="warning">required</Badge>
                    )}
                    <button
                      type="button"
                      className="ml-1 rounded p-1 text-slate-400 opacity-0 transition hover:text-red-600 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteField(field.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT PANEL — Config */}
        <div className="w-80 shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-4">
          <Tabs value={configTab} onValueChange={setConfigTab}>
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="field">{t('editor.fieldTab')}</TabsTrigger>
              <TabsTrigger value="form">{t('editor.formTab')}</TabsTrigger>
              <TabsTrigger value="versions">{t('editor.versionsTab')}</TabsTrigger>
            </TabsList>

            {/* FIELD CONFIG TAB */}
            <TabsContent value="field">
              {selectedField ? (
                <FieldConfig
                  field={selectedField}
                  allFields={fields}
                  onUpdate={(updates) => updateField(selectedField.id, updates)}
                  t={t}
                />
              ) : (
                <p className="text-sm text-slate-400">{t('editor.selectField')}</p>
              )}
            </TabsContent>

            {/* FORM TAB */}
            <TabsContent value="form">
              <div className="space-y-3">
                <div>
                  <Label>{t('config.name')}</Label>
                  <p className="mt-1 text-sm text-slate-700">{questionnaire.name}</p>
                </div>
                <div>
                  <Label>{t('config.description')}</Label>
                  <p className="mt-1 text-sm text-slate-500">{questionnaire.description || '—'}</p>
                </div>
                <div>
                  <Label>{t('config.status')}</Label>
                  <div className="mt-1">
                    <Badge tone={statusTone(questionnaire.status)}>{questionnaire.status}</Badge>
                  </div>
                </div>
                <div>
                  <Label>{t('config.fieldCount')}</Label>
                  <p className="mt-1 text-sm text-slate-700">
                    {fields.filter((f) => f.type !== 'section').length} {t('config.questions')}
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* VERSIONS TAB */}
            <TabsContent value="versions">
              <VersionHistory
                versions={versions}
                session={session}
                questionnaireId={questionnaire.id}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('preview.title')}</DialogTitle>
          </DialogHeader>
          <FormPreview fields={fields} formName={questionnaire.name} />
        </DialogContent>
      </Dialog>

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editor.publishTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">{t('editor.publishConfirm')}</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowPublishDialog(false)}>
              {t('editor.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
            >
              {publishMutation.isPending ? t('editor.publishing') : t('editor.publish')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =====================================================
// FIELD CONFIG PANEL
// =====================================================
interface FieldConfigProps {
  field: EditorField;
  allFields: EditorField[];
  onUpdate: (updates: Partial<EditorField>) => void;
  t: ReturnType<typeof useTranslations>;
}

function FieldConfig({ field, allFields, onUpdate, t }: FieldConfigProps) {
  const isSection = field.type === 'section';

  return (
    <div className="space-y-4">
      {/* Label */}
      <div>
        <Label htmlFor="field-label">{isSection ? t('config.sectionTitle') : t('config.label')}</Label>
        <Input
          id="field-label"
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="mt-1"
        />
      </div>

      {/* Description (non-section) */}
      {!isSection && (
        <div>
          <Label htmlFor="field-desc">{t('config.description')}</Label>
          <Input
            id="field-desc"
            value={field.description ?? ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder={t('config.descriptionPlaceholder')}
            className="mt-1"
          />
        </div>
      )}

      {/* Required (non-section) */}
      {!isSection && (
        <div className="flex items-center justify-between">
          <Label>{t('config.required')}</Label>
          <Switch checked={field.required} onCheckedChange={(v) => onUpdate({ required: v })} />
        </div>
      )}

      {/* Type-specific config */}
      {field.type === 'text' && (
        <div>
          <Label>{t('config.placeholder')}</Label>
          <Input
            value={field._placeholder ?? ''}
            onChange={(e) => onUpdate({ _placeholder: e.target.value })}
            className="mt-1"
          />
        </div>
      )}

      {field.type === 'number' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>{t('config.minValue')}</Label>
            <Input
              type="number"
              value={field._min ?? ''}
              onChange={(e) => onUpdate({ _min: e.target.value ? Number(e.target.value) : undefined })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>{t('config.maxValue')}</Label>
            <Input
              type="number"
              value={field._max ?? ''}
              onChange={(e) => onUpdate({ _max: e.target.value ? Number(e.target.value) : undefined })}
              className="mt-1"
            />
          </div>
        </div>
      )}

      {field.type === 'nps' && (
        <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          {t('config.npsFixed')}
          <div className="mt-1 font-medium">0 – 10</div>
        </div>
      )}

      {field.type === 'scale' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>{t('config.scaleMin')}</Label>
            <Input
              type="number"
              value={field.scale?.min ?? 1}
              onChange={(e) =>
                onUpdate({ scale: { min: Number(e.target.value), max: field.scale?.max ?? 5 } })
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label>{t('config.scaleMax')}</Label>
            <Input
              type="number"
              value={field.scale?.max ?? 5}
              onChange={(e) =>
                onUpdate({ scale: { min: field.scale?.min ?? 1, max: Number(e.target.value) } })
              }
              className="mt-1"
            />
          </div>
        </div>
      )}

      {(field.type === 'single_choice' || field.type === 'multi_choice') && (
        <div>
          <Label>{t('config.options')}</Label>
          <Textarea
            rows={5}
            value={(field.options ?? []).join('\n')}
            onChange={(e) =>
              onUpdate({
                options: e.target.value
                  .split('\n')
                  .map((o) => o.trim())
                  .filter(Boolean),
              })
            }
            placeholder={t('config.optionsPlaceholder')}
            className="mt-1"
          />
          <p className="mt-1 text-xs text-slate-400">{t('config.optionsHint')}</p>
        </div>
      )}

      {/* Conditional Display */}
      {!isSection && (
        <div className="border-t border-slate-200 pt-4">
          <Label className="mb-2 block">{t('config.conditionalDisplay')}</Label>
          <ConditionalDisplayEditor
            field={field}
            allFields={allFields}
            onChange={(condition) => onUpdate({ display_condition: condition })}
          />
        </div>
      )}
    </div>
  );
}
