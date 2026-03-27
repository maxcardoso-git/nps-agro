import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useBeforeUnload } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Save,
  Upload,
  FileJson,
  Trash2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Play,
  Undo,
  XCircle,
  FolderKanban,
  Settings,
  Plus,
  GripVertical,
  Type,
  Hash,
  Mail,
  Phone,
  Calendar,
  Clock,
  CheckSquare,
  Circle,
  ChevronDown,
  ToggleLeft,
  EyeOff,
  MessageSquare,
  AlignLeft,
  Database,
  Send,
  List,
  History,
  FolderOpen,
  HelpCircle,
  Layout,
  LayoutTemplate,
  Sparkles,
  Star,
  Download,
  BookOpen,
  Copy,
  FileUp
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { dataEntryFormsAPI } from '@/api/data-entry-forms';
import projectsAPI from '@/api/projects';
import { resourcesAPI } from '@/api/resources';
import { FormPreview, ValidationRulesEditor, ConditionalDisplayEditor, SubmissionsViewer, VersionHistory } from '@/components/form-studio';
import FormsList from './FormsList';
import formTemplates from '@/data/formTemplates';
import { useAuth } from '@/lib/AuthContext';

const DRAFT_STORAGE_KEY = 'form-studio-draft';
const FORM_NAME_COUNTER_KEY = 'form-studio-name-counter';

const generateFormName = () => {
  if (typeof window === 'undefined') {
    return 'Form 001';
  }
  const raw = window.localStorage.getItem(FORM_NAME_COUNTER_KEY);
  let count = Number.parseInt(raw ?? '0', 10);
  if (Number.isNaN(count) || count < 0) {
    count = 0;
  }
  count += 1;
  window.localStorage.setItem(FORM_NAME_COUNTER_KEY, String(count));
  return `Form ${count.toString().padStart(3, '0')}`;
};

// Field type definitions
const FIELD_TYPES = {
  section: {
    label: 'Section',
    icon: Layout,
    defaultConfig: {
      title: 'New Section',
      description: '',
      collapsible: false,
      defaultCollapsed: false
    }
  },
  text: {
    label: 'Text',
    icon: Type,
    defaultConfig: {
      placeholder: '',
      maxLength: 255,
      minLength: 0
    }
  },
  textarea: {
    label: 'Long Text',
    icon: AlignLeft,
    defaultConfig: {
      rows: 4,
      maxLength: 5000
    }
  },
  number: {
    label: 'Number',
    icon: Hash,
    defaultConfig: {
      min: null,
      max: null,
      step: 1,
      decimals: 0
    }
  },
  email: {
    label: 'Email',
    icon: Mail,
    defaultConfig: {
      validateFormat: true
    }
  },
  phone: {
    label: 'Phone',
    icon: Phone,
    defaultConfig: {
      format: 'BR',
      mask: true
    }
  },
  date: {
    label: 'Date',
    icon: Calendar,
    defaultConfig: {
      format: 'YYYY-MM-DD',
      minDate: null,
      maxDate: null
    }
  },
  datetime: {
    label: 'Date & Time',
    icon: Clock,
    defaultConfig: {
      format: 'YYYY-MM-DD HH:mm',
      timezone: 'America/Sao_Paulo'
    }
  },
  checkbox: {
    label: 'Checkbox',
    icon: CheckSquare,
    defaultConfig: {
      defaultValue: false
    }
  },
  radio: {
    label: 'Radio',
    icon: Circle,
    defaultConfig: {
      options: [],
      layout: 'vertical'
    }
  },
  select: {
    label: 'Select',
    icon: ChevronDown,
    defaultConfig: {
      options: [],
      multiple: false,
      searchable: false
    }
  },
  switch: {
    label: 'Toggle',
    icon: ToggleLeft,
    defaultConfig: {
      defaultValue: false,
      labelOn: 'Yes',
      labelOff: 'No'
    }
  },
  hidden: {
    label: 'Hidden',
    icon: EyeOff,
    defaultConfig: {
      defaultValue: ''
    }
  },
  context_hint: {
    label: 'Context Hint',
    icon: MessageSquare,
    defaultConfig: {
      hint: '',
      forAgent: true
    }
  }
};

// Generate unique field ID
const generateFieldId = () => `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export default function FormStudio() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  // View mode: 'list' or 'edit'
  const [viewMode, setViewMode] = useState('list');

  // Form state
  const [formName, setFormName] = useState(() => generateFormName());
  const [formDescription, setFormDescription] = useState('');
  const [formVersion, setFormVersion] = useState('1.0.0');
  const [formId, setFormId] = useState(null);
  const [formDbId, setFormDbId] = useState(null); // Database ID for submissions/versions
  const [formStatus, setFormStatus] = useState('DRAFT');
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [writeStrategy, setWriteStrategy] = useState('INSERT_ONLY');
  const [deduplicationMode, setDeduplicationMode] = useState('NONE');
  const [deduplicationKeys, setDeduplicationKeys] = useState([]);
  const [targetConfig, setTargetConfig] = useState({ tableName: '' });

  // UI state
  const [showJsonDialog, setShowJsonDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState(null);
  const [jsonOutput, setJsonOutput] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [changelog, setChangelog] = useState('');
  const [configTab, setConfigTab] = useState('field');
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateCategory, setTemplateCategory] = useState('all');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showImportInstructions, setShowImportInstructions] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState(null);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Load form into editor
  const loadForm = useCallback((form) => {
    setFormId(form.formId);
    setFormDbId(form.id);
    setFormName(form.name);
    setFormDescription(form.description || '');
    setFormVersion(form.version);
    setFormStatus(form.status);
    setFields(form.fields || []);
    setSelectedProjectId(form.projectId || '');
    setSelectedResourceId(form.resourceId || '');
    setWriteStrategy(form.writeStrategy || 'INSERT_ONLY');
    setDeduplicationMode(form.deduplicationMode || 'NONE');
    setDeduplicationKeys(form.deduplicationKeys || []);
    setTargetConfig(form.targetConfig || { tableName: '' });
    setSelectedField(null);
    setHistory([{ fields: form.fields || [] }]);
    setHistoryIndex(0);
    setIsDirty(false);
    setViewMode('edit');
  }, []);

  // Load template into editor
  const loadTemplate = useCallback((template) => {
    if (!template.template) return;

    const t = template.template;
    setFormId(null);
    setFormDbId(null);
    setFormName(t.name || template.name);
    setFormDescription(t.description || template.description);
    setFormVersion('1.0.0');
    setFormStatus('DRAFT');
    setFields(t.fields || []);
    setSelectedProjectId('');
    setSelectedResourceId('');
    setWriteStrategy('INSERT_ONLY');
    setDeduplicationMode('NONE');
    setDeduplicationKeys([]);
    setTargetConfig({ tableName: '' });
    setSelectedField(null);
    setHistory([{ fields: t.fields || [] }]);
    setHistoryIndex(0);
    setIsDirty(true);
    setViewMode('edit');
    setShowTemplatesDialog(false);
  }, []);

  // Create new form
  const handleNewForm = useCallback(() => {
    setFormId(null);
    setFormDbId(null);
    setFormName(generateFormName());
    setFormDescription('');
    setFormVersion('1.0.0');
    setFormStatus('DRAFT');
    setFields([]);
    setSelectedProjectId('');
    setSelectedResourceId('');
    setWriteStrategy('INSERT_ONLY');
    setDeduplicationMode('NONE');
    setDeduplicationKeys([]);
    setTargetConfig({ tableName: '' });
    setSelectedField(null);
    setHistory([]);
    setHistoryIndex(-1);
    setIsDirty(false);
    setViewMode('edit');
  }, []);

  // Handle navigation from Projects page via session storage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const formIdFromSession = window.sessionStorage.getItem('form-studio:formId');
    const projectIdFromSession = window.sessionStorage.getItem('form-studio:projectId');

    // Clear session storage
    window.sessionStorage.removeItem('form-studio:formId');
    window.sessionStorage.removeItem('form-studio:projectId');

    if (formIdFromSession) {
      // Load specific form - fetch it and open editor
      dataEntryFormsAPI.get(formIdFromSession).then((result) => {
        if (result?.data) {
          loadForm(result.data);
        }
      }).catch(() => {
        // Form not found, just go to list
      });
    } else if (projectIdFromSession) {
      // Create new form with pre-selected project
      handleNewForm();
      setSelectedProjectId(projectIdFromSession);
    }
  }, [loadForm, handleNewForm]);

  // History for undo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  useBeforeUnload(
    useCallback(
      (event) => {
        if (isDirty) {
          event.preventDefault();
          event.returnValue = '';
        }
      },
      [isDirty]
    )
  );

  // Save to history
  const saveToHistory = (newFields) => {
    const newState = { fields: newFields };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Undo function
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setFields(prevState.fields);
      setHistoryIndex(historyIndex - 1);
    }
  };

  // Load projects
  const { data: projectsData = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsAPI.list(),
    staleTime: 60_000
  });

  // Load resources
  const { data: resourcesData = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => resourcesAPI.list({ type: 'DB' }),
    staleTime: 60_000
  });

  const projects = projectsData ?? [];
  const resources = resourcesData ?? [];

  // Save form mutation
  const saveFormMutation = useMutation({
    mutationFn: (formData) => {
      if (formDbId) {
        return dataEntryFormsAPI.update(formDbId, formData);
      }
      return dataEntryFormsAPI.create(formData);
    },
    onSuccess: (result) => {
      console.log('[FormStudio] Save success, full result:', JSON.stringify(result, null, 2));
      queryClient.invalidateQueries({ queryKey: ['data-entry-forms'] });
      queryClient.invalidateQueries({ queryKey: ['data-entry-forms-stats'] });
      setSaveError(null);
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setSaveSuccess(true);

      // Handle API response structure: { success: true, data: { id, formId, status, ... } }
      const formData = result?.data;
      if (formData) {
        console.log('[FormStudio] Setting formDbId to:', formData.id);
        console.log('[FormStudio] Setting formId to:', formData.formId);
        console.log('[FormStudio] Form status:', formData.status);
        setFormDbId(formData.id);
        setFormId(formData.formId);
        // Ensure formStatus is set from response (should be 'DRAFT' for new forms)
        if (formData.status) {
          setFormStatus(formData.status);
        }
      } else {
        // Fallback: maybe result IS the form data directly
        console.warn('[FormStudio] No result.data - checking if result is form data directly');
        if (result?.id) {
          console.log('[FormStudio] Result appears to be form data directly, id:', result.id);
          setFormDbId(result.id);
          setFormId(result.formId);
          if (result.status) {
            setFormStatus(result.status);
          }
        } else {
          console.error('[FormStudio] Cannot find form data in response:', result);
        }
      }
      setIsDirty(false);
      setTimeout(() => {
        setSaveSuccess(false);
        setShowSaveDialog(false);
      }, 2000);
    },
    onError: (error) => {
      // Check for validation details from backend
      const details = error?.data?.details || error?.response?.data?.details;
      if (details && Array.isArray(details) && details.length > 0) {
        // Map technical field names to user-friendly labels
        const fieldLabels = {
          name: 'Nome do Formulário',
          description: 'Description',
          projectId: 'Project',
          resourceId: 'Recurso de Destino (aba Destino)',
          deduplicationMode: 'Modo de Deduplicação (aba Destino)',
          deduplicationKeys: 'Campos de Deduplicação',
          writeStrategy: 'Estratégia de Escrita',
          fields: 'Campos do Formulário',
          targetConfig: 'Configuração de Destino'
        };

        const fieldErrors = details.map(d => {
          const field = d.param || d.path || d.field || 'unknown';
          const friendlyName = fieldLabels[field] || field;
          const msg = d.msg || d.message || 'Valor inválido';
          return `• ${friendlyName}: ${msg}`;
        }).join('\n');
        setSaveError(`Error de validação:\n${fieldErrors}`);
      } else {
        const message = error?.data?.error || error?.message || 'No foi possível salvar o formulário';
        setSaveError(message);
      }
    }
  });

  // Publish form mutation
  const publishFormMutation = useMutation({
    mutationFn: () => dataEntryFormsAPI.publish(formDbId, changelog),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-entry-forms'] });
      queryClient.invalidateQueries({ queryKey: ['data-entry-forms-stats'] });
      queryClient.invalidateQueries({ queryKey: ['form-versions', formDbId] });
      setFormStatus('PUBLISHED');
      setShowPublishDialog(false);
      setChangelog('');
    },
    onError: (error) => {
      // Check for validation details from backend
      const details = error?.data?.details || error?.response?.data?.details;
      if (details && Array.isArray(details) && details.length > 0) {
        const fieldErrors = details.map(d => {
          const field = d.param || d.path || d.field || 'unknown';
          const msg = d.msg || d.message || 'Invalid value';
          return `• ${field}: ${msg}`;
        }).join('\n');
        setSaveError(`Validation failed:\n${fieldErrors}`);
      } else {
        const message = error?.data?.error || error?.message || 'Could not publish the form';
        setSaveError(message);
      }
    }
  });

  // Add field
  const handleAddField = useCallback((type) => {
    // Check if trying to add a non-section field without any section
    if (type !== 'section') {
      const hasSection = fields.some(f => f.type === 'section');
      if (!hasSection) {
        setSaveError('Please add a Section first before adding fields. Sections help organize your form.');
        setConfigTab('form');
        return;
      }
    }

    const fieldDef = FIELD_TYPES[type];
    const newField = {
      id: generateFieldId(),
      type,
      name: `${type}_${Date.now()}`,
      label: type === 'section' ? (fieldDef.defaultConfig.title || 'New Section') : `New ${fieldDef.label}`,
      required: false,
      description: '',
      ...fieldDef.defaultConfig
    };

    setFields(prev => {
      const updated = [...prev, newField];
      saveToHistory(updated);
      return updated;
    });
    setSelectedField(newField.id);
    setSaveError(null); // Clear any previous error
    markDirty();
  }, [markDirty, fields]);

  // Update field
  const handleUpdateField = useCallback((fieldId, updates) => {
    setFields(prev => {
      const updated = prev.map(f =>
        f.id === fieldId ? { ...f, ...updates } : f
      );
      saveToHistory(updated);
      return updated;
    });
    markDirty();
  }, [markDirty]);

  // Delete field
  const handleDeleteField = useCallback((fieldId) => {
    setFields(prev => {
      const updated = prev.filter(f => f.id !== fieldId);
      saveToHistory(updated);
      return updated;
    });
    if (selectedField === fieldId) {
      setSelectedField(null);
    }
    setFieldToDelete(null);
    setShowDeleteDialog(false);
    markDirty();
  }, [selectedField, markDirty]);

  // Move field
  const handleMoveField = useCallback((fromIndex, toIndex) => {
    setFields(prev => {
      const updated = [...prev];
      const [removed] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, removed);
      saveToHistory(updated);
      return updated;
    });
    markDirty();
  }, [markDirty]);

  // Drag and drop handlers
  const handleDragStart = useCallback((e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
    // Add drag styling
    e.currentTarget.style.opacity = '0.5';
  }, []);

  const handleDragEnd = useCallback((e) => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    e.currentTarget.style.opacity = '1';
  }, []);

  const handleDragOver = useCallback((e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && index !== draggedIndex) {
      setDragOverIndex(index);
    }
  }, [draggedIndex]);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e, toIndex) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      handleMoveField(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, handleMoveField]);

  // Save form
  const handleSave = useCallback(() => {
    // Project validation
    if (!selectedProjectId) {
      setSaveError('Please select a project before saving');
      setConfigTab('form');
      return;
    }

    // Build form data - only include fields with valid values
    const formData = {
      name: formName,
      description: formDescription,
      version: formVersion,
      layout: { columns: 12, rows: [] },
      fields,
      writeStrategy: writeStrategy || 'INSERT_ONLY',
      deduplicationMode: deduplicationMode || 'NONE',
      deduplicationKeys: deduplicationMode && deduplicationMode !== 'NONE' ? deduplicationKeys : []
    };

    // Only include optional fields if they have values
    if (selectedProjectId) {
      formData.projectId = selectedProjectId;
    }
    if (selectedResourceId) {
      formData.resourceId = selectedResourceId;
    }
    if (targetConfig && Object.keys(targetConfig).length > 0) {
      formData.targetConfig = targetConfig;
    }

    saveFormMutation.mutate(formData);
  }, [formName, formDescription, formVersion, fields, selectedProjectId, selectedResourceId, targetConfig, writeStrategy, deduplicationMode, deduplicationKeys, saveFormMutation]);

  // Export JSON
  const handleExportJson = useCallback(() => {
    const formData = {
      name: formName,
      description: formDescription,
      version: formVersion,
      status: formStatus,
      fields,
      targetConfig,
      writeStrategy,
      deduplicationMode,
      deduplicationKeys
    };
    setJsonOutput(JSON.stringify(formData, null, 2));
    setShowJsonDialog(true);
  }, [formName, formDescription, formVersion, formStatus, fields, targetConfig, writeStrategy, deduplicationMode, deduplicationKeys]);

  // Import JSON
  const handleImportJson = useCallback(() => {
    setImportError(null);

    if (!importJsonText.trim()) {
      setImportError('Cole o JSON do formulário no campo acima');
      return;
    }

    try {
      const parsed = JSON.parse(importJsonText);

      // Validate required structure
      if (!parsed.fields || !Array.isArray(parsed.fields)) {
        setImportError('JSON inválido: o campo "fields" é obrigatório e deve ser um array');
        return;
      }

      // Validate and normalize each field
      for (let i = 0; i < parsed.fields.length; i++) {
        const field = parsed.fields[i];
        if (!field.type) {
          setImportError(`JSON inválido: campo ${i + 1} não tem "type" definido`);
          return;
        }
        if (!field.id) {
          // Generate id if missing
          parsed.fields[i].id = `field_${Date.now()}_${i}`;
        }
        if (!field.label) {
          parsed.fields[i].label = `Campo ${i + 1}`;
        }

        // Normalize: move config properties to root level (Form Studio format)
        if (field.config) {
          const { options, layout, multiple, searchable, ...restConfig } = field.config;
          // Move options to root if present
          if (options && !field.options) {
            parsed.fields[i].options = options;
          }
          // Move layout to root
          if (layout) {
            parsed.fields[i].layout = layout;
          }
          // Move multiple to root
          if (multiple !== undefined) {
            parsed.fields[i].multiple = multiple;
          }
          // Move searchable to root
          if (searchable !== undefined) {
            parsed.fields[i].searchable = searchable;
          }
          // Keep other config properties
          if (Object.keys(restConfig).length > 0) {
            parsed.fields[i].config = restConfig;
          } else {
            delete parsed.fields[i].config;
          }
        }
      }

      // Load the form data
      setFormId(null);
      setFormDbId(null);
      setFormName(parsed.name || generateFormName());
      setFormDescription(parsed.description || '');
      setFormVersion(parsed.version || '1.0.0');
      setFormStatus('DRAFT');
      setFields(parsed.fields);
      setSelectedProjectId('');
      setSelectedResourceId('');
      setWriteStrategy(parsed.writeStrategy || 'INSERT_ONLY');
      setDeduplicationMode(parsed.deduplicationMode || 'NONE');
      setDeduplicationKeys(parsed.deduplicationKeys || []);
      setTargetConfig(parsed.targetConfig || { tableName: '' });
      setSelectedField(null);
      setHistory([{ fields: parsed.fields }]);
      setHistoryIndex(0);
      setIsDirty(true);

      // Close dialog and reset
      setShowImportDialog(false);
      setImportJsonText('');
      setImportError(null);

    } catch (e) {
      setImportError(`Error while parsear JSON: ${e.message}`);
    }
  }, [importJsonText]);

  // Get selected field data
  const selectedFieldData = useMemo(() => {
    return fields.find(f => f.id === selectedField);
  }, [fields, selectedField]);

  // Get selected project name (must be before early return to respect Rules of Hooks)
  const selectedProjectName = useMemo(() => {
    const project = projects.find(p => p.id === selectedProjectId);
    return project?.name || null;
  }, [projects, selectedProjectId]);

  // Show list view
  if (viewMode === 'list') {
    return (
      <FormsList
        onEditForm={loadForm}
        onNewForm={handleNewForm}
      />
    );
  }

  // Editor view
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-violet-900 via-indigo-900 to-blue-900 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('list')}
              title="Back to list"
              className="text-white hover:bg-white/10"
            >
              <List className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <FileJson className="h-5 w-5 text-amber-300" />
                <Input
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    markDirty();
                  }}
                  className="text-xl font-semibold border-none bg-transparent h-8 w-72 text-white placeholder:text-white/50 focus:ring-0"
                  placeholder="Form Name"
                  disabled={formStatus !== 'DRAFT'}
                />
                <Badge variant={formStatus === 'PUBLISHED' ? 'default' : 'secondary'} className={formStatus === 'PUBLISHED' ? 'bg-green-500' : 'bg-white/20 text-white'}>
                  {formStatus}
                </Badge>
                {isDirty && (
                  <Badge variant="outline" className="border-yellow-400 text-yellow-300">
                    Unsaved
                  </Badge>
                )}
              </div>
              {selectedProjectName && (
                <p className="text-sm text-white/70 mt-1 ml-8 flex items-center gap-2">
                  <FolderKanban className="h-3.5 w-3.5" />
                  {selectedProjectName}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowTemplatesDialog(true)}
              className="bg-white/10 text-white border-white/30 hover:bg-white/20"
            >
              <LayoutTemplate className="h-4 w-4 mr-2" />
              Templates
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowHelpDialog(true)}
              className="bg-white/10 text-white border-white/30 hover:bg-white/20"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              How it Works
            </Button>
            <Separator orientation="vertical" className="h-6 bg-white/30" />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleUndo}
              disabled={historyIndex <= 0 || formStatus !== 'DRAFT'}
              title="Undo"
              className="text-white hover:bg-white/10 disabled:text-white/30"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExportJson}
              title="Export JSON"
              className="text-white hover:bg-white/10"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setImportJsonText('');
                setImportError(null);
                setShowImportDialog(true);
              }}
              title="Import JSON"
              className="text-white hover:bg-white/10"
            >
              <FileUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPreviewDialog(true)}
              title="Preview"
              className="text-white hover:bg-white/10"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6 bg-white/30" />
            <Button
              variant="secondary"
              onClick={() => setShowSaveDialog(true)}
              disabled={saveFormMutation.isPending}
              className="bg-white/10 text-white border-white/30 hover:bg-white/20"
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            {console.log('[FormStudio Render] formDbId:', formDbId, 'formStatus:', formStatus)}
            {formDbId && formStatus === 'DRAFT' && (
              <Button
                onClick={() => setShowPublishDialog(true)}
                disabled={publishFormMutation.isPending}
                className="bg-white text-slate-900 hover:bg-white/90"
              >
                <Send className="h-4 w-4 mr-2" />
                Publish
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Field Palette */}
        <div className="w-64 border-r bg-card p-4 overflow-y-auto">
          <h3 className="font-semibold mb-4">Fields</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(FIELD_TYPES).map(([type, config]) => {
              const Icon = config.icon;
              return (
                <Button
                  key={type}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center gap-1 text-xs"
                  onClick={() => handleAddField(type)}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-center">{config.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 p-6 overflow-y-auto bg-muted/30">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>{formName}</CardTitle>
              <CardDescription>{formDescription || 'No description'}</CardDescription>
            </CardHeader>
            <CardContent>
              {fields.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Click on a field type to add it</p>
                  <p className="text-sm">or drag fields from the palette</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {fields.map((field, index) => {
                    const FieldIcon = FIELD_TYPES[field.type]?.icon || Type;
                    const isDragging = draggedIndex === index;
                    const isDragOver = dragOverIndex === index;
                    return (
                      <div
                        key={field.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, index)}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedField === field.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-primary/50'
                        } ${isDragging ? 'opacity-50 scale-95' : ''} ${
                          isDragOver ? 'border-2 border-dashed border-blue-500 bg-blue-50 dark:bg-blue-950' : ''
                        }`}
                        onClick={() => setSelectedField(field.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                            <FieldIcon className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{field.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {field.name} - {FIELD_TYPES[field.type]?.label}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {field.required && (
                              <Badge variant="destructive" className="text-xs">
                                Required
                              </Badge>
                            )}
                            {field.validationRules?.length > 0 && (
                              <Badge variant="outline" className="text-xs text-blue-600">
                                {field.validationRules.length} rule{field.validationRules.length > 1 ? 's' : ''}
                              </Badge>
                            )}
                            {field.displayCondition?.dependsOn && (
                              <Badge variant="outline" className="text-xs text-purple-600">
                                Conditional
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFieldToDelete(field.id);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Config Panel */}
        <div className="w-96 border-l bg-card overflow-y-auto">
          <Tabs value={configTab} onValueChange={setConfigTab} className="h-full">
            <TabsList className="w-full grid grid-cols-5 px-2 pt-2">
              <TabsTrigger value="field" className="text-xs">Field</TabsTrigger>
              <TabsTrigger value="form" className="text-xs">Form</TabsTrigger>
              <TabsTrigger value="data" className="text-xs">Data</TabsTrigger>
              <TabsTrigger value="submissions" className="text-xs" disabled={!formDbId}>Submissions</TabsTrigger>
              <TabsTrigger value="versions" className="text-xs" disabled={!formDbId}>Versions</TabsTrigger>
            </TabsList>

            <TabsContent value="field" className="p-4">
              {selectedFieldData ? (
                <div className="space-y-4">
                  <div>
                    <Label>Field Name</Label>
                    <Input
                      value={selectedFieldData.name}
                      onChange={(e) => handleUpdateField(selectedField, { name: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Label</Label>
                    <Input
                      value={selectedFieldData.label}
                      onChange={(e) => handleUpdateField(selectedField, { label: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={selectedFieldData.description || ''}
                      onChange={(e) => handleUpdateField(selectedField, { description: e.target.value })}
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Required</Label>
                    <Switch
                      checked={selectedFieldData.required}
                      onCheckedChange={(checked) => handleUpdateField(selectedField, { required: checked })}
                    />
                  </div>

                  {/* Section-specific config */}
                  {selectedFieldData.type === 'section' && (
                    <>
                      <div>
                        <Label>Section Title</Label>
                        <Input
                          value={selectedFieldData.title || selectedFieldData.label}
                          onChange={(e) => handleUpdateField(selectedField, { title: e.target.value, label: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Collapsible</Label>
                        <Switch
                          checked={selectedFieldData.collapsible || false}
                          onCheckedChange={(checked) => handleUpdateField(selectedField, { collapsible: checked })}
                        />
                      </div>
                    </>
                  )}

                  {/* Type-specific configs */}
                  {(selectedFieldData.type === 'text' || selectedFieldData.type === 'textarea') && (
                    <>
                      <div>
                        <Label>Placeholder</Label>
                        <Input
                          value={selectedFieldData.placeholder || ''}
                          onChange={(e) => handleUpdateField(selectedField, { placeholder: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Min. Characters</Label>
                          <Input
                            type="number"
                            value={selectedFieldData.minLength || 0}
                            onChange={(e) => handleUpdateField(selectedField, { minLength: parseInt(e.target.value) || 0 })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Max. Characters</Label>
                          <Input
                            type="number"
                            value={selectedFieldData.maxLength || 255}
                            onChange={(e) => handleUpdateField(selectedField, { maxLength: parseInt(e.target.value) || 255 })}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {selectedFieldData.type === 'number' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Minimum</Label>
                        <Input
                          type="number"
                          value={selectedFieldData.min ?? ''}
                          onChange={(e) => handleUpdateField(selectedField, { min: e.target.value ? parseFloat(e.target.value) : null })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Maximum</Label>
                        <Input
                          type="number"
                          value={selectedFieldData.max ?? ''}
                          onChange={(e) => handleUpdateField(selectedField, { max: e.target.value ? parseFloat(e.target.value) : null })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}

                  {(selectedFieldData.type === 'select' || selectedFieldData.type === 'radio') && (
                    <div>
                      <Label>Options (one per line)</Label>
                      <Textarea
                        value={(selectedFieldData.options || []).map(o => typeof o === 'string' ? o : (o.label || o.value)).join('\n')}
                        onChange={(e) => {
                          // Keep all lines during editing (including empty), filter only non-empty when saving
                          const lines = e.target.value.split('\n');
                          const options = lines.map(v => {
                            const label = v.trim();
                            // Generate slug-like value from label
                            const value = label.toLowerCase()
                              .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
                              .replace(/[^a-z0-9]+/g, '_') // replace non-alphanumeric with underscore
                              .replace(/^_|_$/g, ''); // trim underscores
                            return { value: value || label, label };
                          });
                          handleUpdateField(selectedField, { options });
                        }}
                        onBlur={(e) => {
                          // Clean up empty options on blur
                          const options = e.target.value.split('\n').filter(v => v.trim()).map(v => {
                            const label = v.trim();
                            const value = label.toLowerCase()
                              .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                              .replace(/[^a-z0-9]+/g, '_')
                              .replace(/^_|_$/g, '');
                            return { value: value || label, label };
                          });
                          handleUpdateField(selectedField, { options });
                        }}
                        className="mt-1"
                        rows={4}
                        placeholder="Option 1&#10;Option 2&#10;Option 3"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        O valor interno será gerado automaticamente (slug)
                      </p>
                    </div>
                  )}

                  <Separator className="my-4" />

                  {/* Validation Rules */}
                  <ValidationRulesEditor
                    field={selectedFieldData}
                    rules={selectedFieldData.validationRules || []}
                    onChange={(rules) => handleUpdateField(selectedField, { validationRules: rules })}
                    allFields={fields}
                  />

                  {/* Conditional Display */}
                  <ConditionalDisplayEditor
                    field={selectedFieldData}
                    condition={selectedFieldData.displayCondition}
                    onChange={(condition) => handleUpdateField(selectedField, { displayCondition: condition })}
                    allFields={fields}
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Select a field to configure</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="form" className="p-4">
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      markDirty();
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formDescription}
                    onChange={(e) => {
                      setFormDescription(e.target.value);
                      markDirty();
                    }}
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Version</Label>
                  <Input
                    value={formVersion}
                    onChange={(e) => {
                      setFormVersion(e.target.value);
                      markDirty();
                    }}
                    className="mt-1"
                    placeholder="1.0.0"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1">
                    Project <span className="text-destructive">*</span>
                  </Label>
                  <Select value={selectedProjectId} onValueChange={(v) => { setSelectedProjectId(v); markDirty(); }}>
                    <SelectTrigger className={`mt-1 ${!selectedProjectId && saveError ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Required to save the form</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="data" className="p-4">
              <div className="space-y-4">
                <div>
                  <Label>Target Resource (DB)</Label>
                  <Select value={selectedResourceId || '_none_'} onValueChange={(v) => { setSelectedResourceId(v === '_none_' ? '' : v); markDirty(); }}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a resource" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">None</SelectItem>
                      {resources.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name} ({r.subtype})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Table Name</Label>
                  <Input
                    value={targetConfig.tableName || ''}
                    onChange={(e) => {
                      setTargetConfig({ ...targetConfig, tableName: e.target.value });
                      markDirty();
                    }}
                    className="mt-1"
                    placeholder="table_name"
                  />
                </div>
                <div>
                  <Label>Write Strategy</Label>
                  <Select value={writeStrategy} onValueChange={(v) => { setWriteStrategy(v); markDirty(); }}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INSERT_ONLY">Insert Only</SelectItem>
                      <SelectItem value="UPSERT">Upsert</SelectItem>
                      <SelectItem value="UPDATE_ONLY">Update Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Deduplication Mode</Label>
                  <Select value={deduplicationMode} onValueChange={(v) => { setDeduplicationMode(v); markDirty(); }}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      <SelectItem value="UNIQUE_KEY">Unique Key</SelectItem>
                      <SelectItem value="COMPOSITE_KEY">Composite Key</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {deduplicationMode !== 'NONE' && (
                  <div>
                    <Label>Deduplication Fields</Label>
                    <Select
                      value={deduplicationKeys[0] || ''}
                      onValueChange={(v) => {
                        setDeduplicationKeys(v ? [v] : []);
                        markDirty();
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {fields.filter(f => f.type !== 'section' && f.name).map((f) => (
                          <SelectItem key={f.id} value={f.name}>{f.label} ({f.name})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="submissions" className="p-4">
              {formDbId ? (
                <SubmissionsViewer
                  formId={formDbId}
                  formName={formName}
                  fields={fields.filter(f => f.type !== 'section')}
                  allFields={fields}
                  hasDataSource={!!selectedResourceId}
                  resourceLabel={selectedResourceId ? `${resources.find(r => r.id === selectedResourceId)?.name || 'DB'}${targetConfig?.tableName ? ` → ${targetConfig.tableName}` : ''}` : null}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Save the form to view submissions</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="versions" className="p-4">
              {formDbId ? (
                <VersionHistory
                  formId={formDbId}
                  currentVersion={formVersion}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Save the form to view versions</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Form</DialogTitle>
            <DialogDescription>
              Confirm the information before saving
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>
            <div>
              <Label className="flex items-center gap-1">
                Project <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedProjectId}
                onValueChange={(v) => setSelectedProjectId(v)}
              >
                <SelectTrigger className={`mt-1 ${!selectedProjectId ? 'border-destructive' : ''}`}>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedProjectId && (
                <p className="text-xs text-destructive mt-1">Project is required to save the form</p>
              )}
            </div>
            {saveError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="whitespace-pre-line">{saveError}</AlertDescription>
              </Alert>
            )}
            {saveSuccess && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>Form saved successfully!</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveFormMutation.isPending || !selectedProjectId}>
              {saveFormMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Form</DialogTitle>
            <DialogDescription>
              Once published, the schema will be frozen and the form will be available for submissions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Changelog (optional)</Label>
              <Textarea
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                className="mt-1"
                rows={3}
                placeholder="Describe the changes in this version..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => publishFormMutation.mutate()} disabled={publishFormMutation.isPending}>
              {publishFormMutation.isPending ? 'Publishing...' : 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Interactive Preview</DialogTitle>
            <DialogDescription>
              Test the form with real-time validation
            </DialogDescription>
          </DialogHeader>
          {!isAuthenticated && formDbId && (
            <Alert variant="warning" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Você não está logado. Para testar o envio do formulário no servidor, faça login primeiro.
              </AlertDescription>
            </Alert>
          )}
          <FormPreview
            formName={formName}
            formDescription={formDescription}
            fields={fields}
            onTest={formDbId ? (data) => {
              if (!isAuthenticated) {
                return Promise.reject(new Error('Você precisa estar logado para testar o formulário. Por favor, faça login e tente novamente.'));
              }
              return dataEntryFormsAPI.test(formDbId, data);
            } : undefined}
          />
        </DialogContent>
      </Dialog>

      {/* JSON Export Dialog */}
      <Dialog open={showJsonDialog} onOpenChange={setShowJsonDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Exportar Form JSON</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={jsonOutput}
              readOnly
              className="font-mono text-sm h-96"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(jsonOutput);
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar
            </Button>
            <Button onClick={() => setShowJsonDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* JSON Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5" />
              Importar Formulário JSON
            </DialogTitle>
            <DialogDescription>
              Cole o JSON do formulário abaixo para importá-lo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label>JSON do Formulário</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImportInstructions(true)}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Ver Instruções
              </Button>
            </div>
            <Textarea
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder='{"name": "Meu Formulário", "fields": [...]}'
              className="font-mono text-sm h-80"
            />
            {importError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{importError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleImportJson}>
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Instructions Dialog */}
      <Dialog open={showImportInstructions} onOpenChange={setShowImportInstructions}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Instruções para Gerar JSON de Formulário
            </DialogTitle>
            <DialogDescription>
              Siga esta estrutura para criar um JSON válido para importação
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4 text-sm">
            <section>
              <h3 className="font-semibold text-base mb-3">Estrutura Básica</h3>
              <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg overflow-x-auto text-xs">
{`{
  "name": "Nome do Formulário",
  "description": "Description opcional",
  "version": "1.0.0",
  "fields": [
    // Array de campos (obrigatório)
  ]
}`}
              </pre>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-3">Tipos de Campo Disponíveis</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { type: 'section', desc: 'Seção/Bloco' },
                  { type: 'text', desc: 'Texto curto' },
                  { type: 'textarea', desc: 'Texto longo' },
                  { type: 'number', desc: 'Número' },
                  { type: 'email', desc: 'E-mail' },
                  { type: 'phone', desc: 'Telefone' },
                  { type: 'date', desc: 'Data' },
                  { type: 'datetime', desc: 'Data e Hora' },
                  { type: 'checkbox', desc: 'Caixa de seleção' },
                  { type: 'radio', desc: 'Escolha única' },
                  { type: 'select', desc: 'Lista suspensa' },
                  { type: 'switch', desc: 'Toggle on/off' }
                ].map(({ type, desc }) => (
                  <div key={type} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded">
                    <code className="text-xs text-violet-600 dark:text-violet-400">{type}</code>
                    <span className="text-xs text-muted-foreground">- {desc}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-3">Estrutura de um Campo</h3>
              <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg overflow-x-auto text-xs">
{`{
  "id": "campo_unico",        // ID único (gerado automaticamente se omitido)
  "type": "text",             // Tipo do campo (obrigatório)
  "label": "Nome do Campo",   // Label visível (obrigatório)
  "name": "nome_interno",     // Nome interno (opcional)
  "required": true,           // Obrigatório? (default: false)
  "placeholder": "Digite...", // Placeholder (opcional)
  "description": "Help",     // Texto de ajuda (opcional)
  "config": {}                // Configurações específicas do tipo
}`}
              </pre>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-3">Campos com Opções (radio, select)</h3>
              <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg overflow-x-auto text-xs">
{`{
  "id": "cargo",
  "type": "radio",
  "label": "Qual seu cargo?",
  "required": true,
  "config": {
    "options": [
      { "value": "founder", "label": "Founder / Co-Founder" },
      { "value": "ceo", "label": "CEO / C-Level" },
      { "value": "diretor", "label": "Diretor / Head" },
      { "value": "outro", "label": "Outro" }
    ],
    "layout": "vertical"
  }
}`}
              </pre>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-3">Seção (Bloco)</h3>
              <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg overflow-x-auto text-xs">
{`{
  "id": "bloco_1",
  "type": "section",
  "label": "Contexto Profissional",
  "config": {
    "title": "Contexto Profissional",
    "description": "Quem é você",
    "collapsible": false
  }
}`}
              </pre>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-3">Múltipla Escolha (checkbox múltiplo)</h3>
              <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg overflow-x-auto text-xs">
{`{
  "id": "motivacao",
  "type": "select",
  "label": "O que te motivou? (múltipla escolha)",
  "config": {
    "multiple": true,
    "options": [
      { "value": "network", "label": "Expandir network" },
      { "value": "parceiros", "label": "Encontrar parceiros" },
      { "value": "aprender", "label": "Aprender com líderes" }
    ]
  }
}`}
              </pre>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-3">Exemplo Completo</h3>
              <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg overflow-x-auto text-xs max-h-64">
{`{
  "name": "Formulário de Onboarding",
  "description": "Formulário de cadastro inicial",
  "version": "1.0.0",
  "fields": [
    {
      "id": "bloco_contexto",
      "type": "section",
      "label": "Contexto Profissional",
      "config": {
        "title": "🔹 Contexto Profissional",
        "description": "Quem é você"
      }
    },
    {
      "id": "momento_profissional",
      "type": "radio",
      "label": "Qual melhor descreve seu momento profissional?",
      "required": true,
      "config": {
        "options": [
          { "value": "founder", "label": "Founder / Co-Founder" },
          { "value": "c_level", "label": "C-Level" },
          { "value": "diretor", "label": "Diretor / Head" }
        ],
        "layout": "vertical"
      }
    },
    {
      "id": "nome_completo",
      "type": "text",
      "label": "Nome completo",
      "required": true,
      "placeholder": "Digite seu nome"
    }
  ]
}`}
              </pre>
            </section>

            <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <strong>Dica:</strong> Use uma IA (como Claude ou ChatGPT) para gerar o JSON.
                Basta descrever os campos do formulário e pedir para gerar no formato acima.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowImportInstructions(false)}>
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Field Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Field</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this field? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFieldToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteField(fieldToDelete)}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Help Dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>How Form Studio Works</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold mb-2">1. Create a Form</h3>
              <p className="text-muted-foreground">Start by selecting a project and giving your form a name. Forms belong to projects for organization and access control.</p>
            </section>
            <section>
              <h3 className="font-semibold mb-2">2. Add Fields</h3>
              <p className="text-muted-foreground">Click on field types in the left palette to add them to your form. Available types include text, number, email, date, select, and more.</p>
            </section>
            <section>
              <h3 className="font-semibold mb-2">3. Organize with Sections</h3>
              <p className="text-muted-foreground">Use "Section" fields to divide your form into logical groups. Sections create visual separators and help users navigate longer forms.</p>
            </section>
            <section>
              <h3 className="font-semibold mb-2">4. Configure Fields</h3>
              <p className="text-muted-foreground">Click on any field to configure its properties: label, placeholder, validation rules, and conditional display settings.</p>
            </section>
            <section>
              <h3 className="font-semibold mb-2">5. Preview & Test</h3>
              <p className="text-muted-foreground">Use the Preview button to see how your form will look and test validation in real-time.</p>
            </section>
            <section>
              <h3 className="font-semibold mb-2">6. Save & Publish</h3>
              <p className="text-muted-foreground">Save your form as a draft, then publish when ready. Published forms have their schema frozen and can receive submissions.</p>
            </section>
            <section>
              <h3 className="font-semibold mb-2">7. API Integration</h3>
              <p className="text-muted-foreground">Published forms expose a schema endpoint for AI agents and external systems to submit data programmatically.</p>
            </section>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowHelpDialog(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Templates Dialog */}
      <Dialog open={showTemplatesDialog} onOpenChange={setShowTemplatesDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-purple-600" />
              Form Templates
            </DialogTitle>
            <DialogDescription>
              Choose a template to quickly start building your form
            </DialogDescription>
          </DialogHeader>

          {/* Search and Filter */}
          <div className="flex items-center gap-4 py-4 border-b">
            <div className="flex-1 relative">
              <Input
                placeholder="Search templates..."
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                className="pl-4"
              />
            </div>
            <Select value={templateCategory} onValueChange={setTemplateCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {[...new Set(formTemplates.map(t => t.category))].sort().map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Templates Grid */}
          <ScrollArea className="flex-1 pr-4">
            <div className="grid grid-cols-2 gap-4 py-4">
              {formTemplates
                .filter(t => {
                  const matchesSearch = t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
                                       t.description.toLowerCase().includes(templateSearch.toLowerCase());
                  const matchesCategory = templateCategory === 'all' || t.category === templateCategory;
                  return matchesSearch && matchesCategory;
                })
                .map(template => {
                  const Icon = template.icon;
                  return (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 ${template.borderColor} ${template.bgColor}`}
                      onClick={() => loadTemplate(template)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start gap-3">
                          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${template.color} flex items-center justify-center flex-shrink-0`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base truncate">{template.name}</CardTitle>
                            <Badge variant="outline" className="text-xs mt-1">{template.category}</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {template.description}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{template.stats.fields} fields</span>
                          <span>{template.stats.sections} sections</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.features.slice(0, 3).map((feature, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </ScrollArea>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setShowTemplatesDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
