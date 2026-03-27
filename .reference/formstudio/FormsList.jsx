import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Search,
  FileJson,
  MoreVertical,
  Edit,
  Trash2,
  Send,
  Archive,
  Copy,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileX,
  HelpCircle,
  Sparkles,
  FolderKanban,
  Layout,
  Settings,
  Lightbulb,
  Database,
  Zap,
  Shield,
  Code,
  FileText,
  Layers,
  BookOpen,
  Type,
  Hash,
  ToggleLeft,
  ListChecks,
  Workflow,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Undo2,
  Pencil,
  X,
  ChevronLeft,
  ChevronRight,
  TableProperties
} from 'lucide-react';
import { dataEntryFormsAPI } from '@/api/data-entry-forms';
import { usePermissions } from '@/lib/PermissionsContext';
import apiKeysAPI from '@/api/api-keys';
import { apiClient } from '@/api/client';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { FormPreview, SubmissionsViewer } from '@/components/form-studio';

const STATUS_CONFIG = {
  DRAFT: { label: 'Draft', variant: 'secondary', icon: Edit },
  TESTING: { label: 'Testing', variant: 'outline', icon: Clock },
  PUBLISHED: { label: 'Published', variant: 'default', icon: CheckCircle2 },
  DEPRECATED: { label: 'Deprecated', variant: 'destructive', icon: Archive }
};

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'DEPRECATED', label: 'Archived' }
];

const BIA_CONFIG_STORAGE_KEY = 'formStudio.biaConfig';

const DEFAULT_BIA_CONFIG = {
  workflowId: '',
  apiKey: '',
  apiKeyId: '',
  promptTemplate: ''
};

const getInitialBiaConfig = () => {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_BIA_CONFIG };
  }
  try {
    const stored = localStorage.getItem(BIA_CONFIG_STORAGE_KEY);
    if (!stored) {
      return { ...DEFAULT_BIA_CONFIG };
    }
    return { ...DEFAULT_BIA_CONFIG, ...JSON.parse(stored) };
  } catch (error) {
    return { ...DEFAULT_BIA_CONFIG };
  }
};

// Clipboard utility with fallback for non-secure contexts (HTTP)
const copyToClipboard = async (text) => {
  // Try modern Clipboard API first (requires HTTPS or localhost)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Clipboard API failed, trying fallback:', err);
    }
  }

  // Fallback: create a temporary textarea and use execCommand
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const success = document.execCommand('copy');
    document.body.removeChild(textArea);

    if (!success) {
      throw new Error('execCommand copy failed');
    }
    return true;
  } catch (err) {
    console.error('Clipboard fallback failed:', err);
    return false;
  }
};

// JSON Syntax Highlighter Component
const JsonHighlight = ({ data, className = '' }) => {
  const formatValue = (value, indent = 0) => {
    const spaces = '  '.repeat(indent);

    if (value === null) return <span className="text-orange-400">null</span>;
    if (value === undefined) return <span className="text-orange-400">undefined</span>;
    if (typeof value === 'boolean') return <span className="text-orange-400">{value.toString()}</span>;
    if (typeof value === 'number') return <span className="text-cyan-400">{value}</span>;
    if (typeof value === 'string') return <span className="text-green-400">"{value}"</span>;

    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-slate-400">[]</span>;
      return (
        <>
          <span className="text-slate-400">[</span>
          {value.map((item, i) => (
            <div key={i} style={{ marginLeft: `${(indent + 1) * 12}px` }}>
              {formatValue(item, indent + 1)}
              {i < value.length - 1 && <span className="text-slate-500">,</span>}
            </div>
          ))}
          <span className="text-slate-400" style={{ marginLeft: `${indent * 12}px` }}>]</span>
        </>
      );
    }

    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) return <span className="text-slate-400">{'{}'}</span>;
      return (
        <>
          <span className="text-slate-400">{'{'}</span>
          {keys.map((key, i) => (
            <div key={key} style={{ marginLeft: `${(indent + 1) * 12}px` }}>
              <span className="text-purple-400">"{key}"</span>
              <span className="text-slate-500">: </span>
              {formatValue(value[key], indent + 1)}
              {i < keys.length - 1 && <span className="text-slate-500">,</span>}
            </div>
          ))}
          <span className="text-slate-400" style={{ marginLeft: `${indent * 12}px` }}>{'}'}</span>
        </>
      );
    }

    return <span>{String(value)}</span>;
  };

  return (
    <div className={`bg-slate-900 text-slate-100 p-4 rounded-lg text-xs font-mono leading-relaxed ${className}`}>
      {formatValue(data)}
    </div>
  );
};

// Resizable JSON Box Component
const ResizableJsonBox = ({ data, minHeight = 150, maxHeight = 600, defaultHeight = 250 }) => {
  const [height, setHeight] = useState(defaultHeight);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="relative">
      <div
        className="overflow-auto resize-y border border-slate-700 rounded-lg"
        style={{
          height: isExpanded ? 'auto' : height,
          minHeight: minHeight,
          maxHeight: isExpanded ? 'none' : maxHeight
        }}
      >
        <JsonHighlight data={data} className="min-h-full" />
      </div>
      <div className="flex justify-end gap-2 mt-1">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          {isExpanded ? (
            <>
              <ArrowUp className="h-3 w-3" /> Collapse
            </>
          ) : (
            <>
              <ArrowDown className="h-3 w-3" /> Expand
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default function FormsList({ onEditForm, onNewForm }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showBiaConfigDialog, setShowBiaConfigDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [viewForm, setViewForm] = useState(null);
  const [changelog, setChangelog] = useState('');
  const [error, setError] = useState(null);
  const [sortColumn, setSortColumn] = useState('updatedAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [biaConfig, setBiaConfig] = useState(getInitialBiaConfig);
  const [biaConfigError, setBiaConfigError] = useState(null);
  const [biaConfigNotice, setBiaConfigNotice] = useState(null);
  const [biaKeyPending, setBiaKeyPending] = useState(false);
  const [biaPublishPending, setBiaPublishPending] = useState(false);
  const [biaValidationNotice, setBiaValidationNotice] = useState(null);
  const [biaValidationPending, setBiaValidationPending] = useState(false);
  const [showBiaValidationDialog, setShowBiaValidationDialog] = useState(false);
  const [biaValidationForm, setBiaValidationForm] = useState(null);
  const [biaValidationPrompt, setBiaValidationPrompt] = useState('');
  const [showDataDialog, setShowDataDialog] = useState(false);
  const [dataForm, setDataForm] = useState(null);

  // Data Browser tab state
  const [mainView, setMainView] = useState('forms');
  const [dbSelectedFormId, setDbSelectedFormId] = useState('');
  const [dbSearchField, setDbSearchField] = useState('');
  const [dbSearchValue, setDbSearchValue] = useState('');
  const [dbActiveSearch, setDbActiveSearch] = useState({ field: '', value: '' });
  const [dbPage, setDbPage] = useState(0);
  const [dbSortField, setDbSortField] = useState('submittedAt');
  const [dbSortDir, setDbSortDir] = useState('desc');
  const [dbViewSubmission, setDbViewSubmission] = useState(null);
  const [dbEditSubmission, setDbEditSubmission] = useState(null);
  const [dbShowFormDialog, setDbShowFormDialog] = useState(false);
  const [dbMutationError, setDbMutationError] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(BIA_CONFIG_STORAGE_KEY, JSON.stringify(biaConfig));
    } catch (storageError) {
      console.warn('[FormsList] Failed to persist BIA config:', storageError);
    }
  }, [biaConfig]);

  // Load forms
  const { data, isLoading, refetch, isFetching, error: queryError } = useQuery({
    queryKey: ['data-entry-forms', statusFilter],
    queryFn: () => dataEntryFormsAPI.list({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      limit: 100
    }),
    staleTime: 30_000,
    retry: (failureCount, error) => {
      // Don't retry on 401 (unauthorized)
      if (error?.response?.status === 401 || error?.status === 401) {
        return false;
      }
      return failureCount < 2;
    }
  });

  // Check for auth errors
  const isAuthError = queryError?.response?.status === 401 ||
                      queryError?.status === 401 ||
                      queryError?.message?.includes('401') ||
                      queryError?.message?.includes('Unauthorized') ||
                      queryError?.message?.includes('expired');

  // Debug: log query error
  if (queryError) {
    console.error('[FormsList] Query error:', queryError);
    console.error('[FormsList] Error status:', queryError?.status);
    console.error('[FormsList] Error message:', queryError?.message);
    console.error('[FormsList] isAuthError:', isAuthError);
  }

  // Load stats
  const { data: statsData } = useQuery({
    queryKey: ['data-entry-forms-stats'],
    queryFn: () => dataEntryFormsAPI.stats(),
    staleTime: 60_000
  });

  // Projects from permissions context (only user's projects)
  const { myProjects: projectsData } = usePermissions();

  // Debug: log the raw API response
  console.log('[FormsList] Raw API data:', data);
  console.log('[FormsList] Is Array?:', Array.isArray(data));

  // Handle both formats: Array directly OR { data: Array }
  const forms = Array.isArray(data) ? data : (data?.data || []);
  console.log('[FormsList] Extracted forms:', forms);
  console.log('[FormsList] Forms count:', forms.length);

  // statsData já é o objeto de stats (API já extrai .data)
  const stats = statsData || {};
  const projects = projectsData ?? [];

  // Data Browser: available forms (PUBLISHED/TESTING only)
  const dbForms = forms.filter(f => f.status === 'PUBLISHED' || f.status === 'TESTING');
  const dbSelectedForm = dbForms.find(f => f.id === dbSelectedFormId);
  const dbFields = (dbSelectedForm?.fields || []).filter(f => f.type !== 'section');
  const dbLimit = 25;

  // Data Browser: submissions query
  const { data: dbSubmissionsData, isLoading: dbSubmissionsLoading, isFetching: dbSubmissionsFetching, refetch: dbRefetch } = useQuery({
    queryKey: ['data-browser-submissions', dbSelectedFormId, dbPage, dbActiveSearch.field, dbActiveSearch.value],
    queryFn: () => dataEntryFormsAPI.getSubmissions(dbSelectedFormId, {
      limit: dbLimit,
      offset: dbPage * dbLimit,
      keyField: dbActiveSearch.field || undefined,
      keyValue: dbActiveSearch.value || undefined,
    }),
    enabled: !!dbSelectedFormId && mainView === 'data',
    staleTime: 30_000,
  });

  const dbSubmissions = dbSubmissionsData?.data || [];
  const dbPagination = dbSubmissionsData?.pagination || { total: 0 };
  const dbTotalPages = Math.ceil(dbPagination.total / dbLimit);

  // Data Browser: sort submissions client-side
  const dbSortedSubmissions = [...dbSubmissions].sort((a, b) => {
    let aVal, bVal;
    if (dbSortField === 'submittedAt') {
      aVal = a.submittedAt || '';
      bVal = b.submittedAt || '';
    } else if (dbSortField === 'status') {
      aVal = a.status || '';
      bVal = b.status || '';
    } else {
      aVal = a.data?.[dbSortField] ?? '';
      bVal = b.data?.[dbSortField] ?? '';
    }
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    if (aVal < bVal) return dbSortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return dbSortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // Data Browser: mutations
  const dbSubmitMutation = useMutation({
    mutationFn: (values) => dataEntryFormsAPI.submit(dbSelectedFormId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-browser-submissions', dbSelectedFormId] });
      setDbShowFormDialog(false);
      setDbEditSubmission(null);
      setDbMutationError(null);
    },
    onError: (err) => setDbMutationError(err?.data?.error || err?.message || 'Failed to submit'),
  });

  const dbUpdateMutation = useMutation({
    mutationFn: ({ submissionId, values }) => dataEntryFormsAPI.updateSubmission(dbSelectedFormId, submissionId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-browser-submissions', dbSelectedFormId] });
      setDbShowFormDialog(false);
      setDbEditSubmission(null);
      setDbMutationError(null);
    },
    onError: (err) => setDbMutationError(err?.data?.error || err?.message || 'Failed to update'),
  });

  const handleDbFormChange = (formId) => {
    setDbSelectedFormId(formId);
    setDbSearchField('');
    setDbSearchValue('');
    setDbActiveSearch({ field: '', value: '' });
    setDbPage(0);
    setDbSortField('submittedAt');
    setDbSortDir('desc');
  };

  const handleDbSearch = () => {
    setDbActiveSearch({ field: dbSearchField, value: dbSearchValue });
    setDbPage(0);
  };

  const handleDbClearSearch = () => {
    setDbSearchField('');
    setDbSearchValue('');
    setDbActiveSearch({ field: '', value: '' });
    setDbPage(0);
  };

  const handleDbSort = (field) => {
    if (dbSortField === field) {
      setDbSortDir(dbSortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setDbSortField(field);
      setDbSortDir('asc');
    }
  };

  const handleDbFormSubmit = async (values) => {
    if (dbEditSubmission) {
      await dbUpdateMutation.mutateAsync({ submissionId: dbEditSubmission.id, values });
    } else {
      await dbSubmitMutation.mutateAsync(values);
    }
  };

  const SUBMISSION_STATUS = {
    pending: { label: 'Pending', variant: 'secondary' },
    validated: { label: 'Validated', variant: 'default' },
    written: { label: 'Written', variant: 'success' },
    error: { label: 'Error', variant: 'destructive' },
  };

  // Filter by search and project
  const filteredForms = forms.filter(form => {
    // Project filter
    if (projectFilter !== 'all' && form.projectId !== projectFilter) {
      return false;
    }
    // Search filter
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      form.name.toLowerCase().includes(searchLower) ||
      form.description?.toLowerCase().includes(searchLower) ||
      form.formId.toLowerCase().includes(searchLower) ||
      form.project?.name?.toLowerCase().includes(searchLower)
    );
  });

  // Sort function
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Sort forms
  const sortedForms = [...filteredForms].sort((a, b) => {
    let aVal, bVal;
    switch (sortColumn) {
      case 'name':
        aVal = a.name?.toLowerCase() || '';
        bVal = b.name?.toLowerCase() || '';
        break;
      case 'project':
        aVal = a.project?.name?.toLowerCase() || '';
        bVal = b.project?.name?.toLowerCase() || '';
        break;
      case 'status':
        aVal = a.status || '';
        bVal = b.status || '';
        break;
      case 'version':
        aVal = a.version || '0';
        bVal = b.version || '0';
        break;
      case 'fields':
        aVal = Array.isArray(a.fields) ? a.fields.length : 0;
        bVal = Array.isArray(b.fields) ? b.fields.length : 0;
        break;
      case 'submissions':
        aVal = a._count?.submissions || 0;
        bVal = b._count?.submissions || 0;
        break;
      case 'updatedAt':
        aVal = new Date(a.updatedAt).getTime();
        bVal = new Date(b.updatedAt).getTime();
        break;
      default:
        aVal = a.updatedAt;
        bVal = b.updatedAt;
    }
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Sort icon helper
  const SortIcon = ({ column }) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => dataEntryFormsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-entry-forms'] });
      queryClient.invalidateQueries({ queryKey: ['data-entry-forms-stats'] });
      setShowDeleteDialog(false);
      setSelectedForm(null);
    },
    onError: (err) => {
      setError(err?.data?.error || err?.message || 'Error deleting form');
    }
  });

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: ({ id, changelog }) => dataEntryFormsAPI.publish(id, changelog),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-entry-forms'] });
      queryClient.invalidateQueries({ queryKey: ['data-entry-forms-stats'] });
      setShowPublishDialog(false);
      setSelectedForm(null);
      setChangelog('');
    },
    onError: (err) => {
      setError(err?.data?.error || err?.message || 'Error publishing form');
    }
  });

  // Deprecate mutation
  const deprecateMutation = useMutation({
    mutationFn: (id) => dataEntryFormsAPI.deprecate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-entry-forms'] });
      queryClient.invalidateQueries({ queryKey: ['data-entry-forms-stats'] });
    },
    onError: (err) => {
      setError(err?.data?.error || err?.message || 'Error deprecating form');
    }
  });

  // Unpublish mutation
  const unpublishMutation = useMutation({
    mutationFn: (id) => dataEntryFormsAPI.unpublish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-entry-forms'] });
      queryClient.invalidateQueries({ queryKey: ['data-entry-forms-stats'] });
    },
    onError: (err) => {
      setError(err?.data?.error || err?.message || 'Error unpublishing form');
    }
  });

  // New version mutation
  const newVersionMutation = useMutation({
    mutationFn: (id) => dataEntryFormsAPI.newVersion(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['data-entry-forms'] });
      if (onEditForm && result?.data?.id) {
        onEditForm(result.data);
      }
    },
    onError: (err) => {
      setError(err?.data?.error || err?.message || 'Error creating new version');
    }
  });

  const handleDelete = (form) => {
    setSelectedForm(form);
    setShowDeleteDialog(true);
    setError(null);
  };

  const handlePublish = (form) => {
    setSelectedForm(form);
    setShowPublishDialog(true);
    setChangelog('');
    setError(null);
  };

  const handleViewForm = (form) => {
    setViewForm(form);
    setShowViewDialog(true);
  };

  const formatBiaTimestamp = (value) => {
    if (!value) return 'Not evaluated yet';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not evaluated yet';
    return date.toLocaleString();
  };

  const getBiaBadgeVariant = (status) => {
    if (status === 'APPROVED') return 'default';
    if (status === 'REJECTED') return 'destructive';
    return 'outline';
  };

  const getBiaBadgeClass = (status) => {
    if (status === 'APPROVED') return 'bg-emerald-500 text-white hover:bg-emerald-500';
    if (status === 'REJECTED') return 'bg-red-500 text-white hover:bg-red-500';
    return '';
  };

  const handleBiaConfigOpen = (open) => {
    setShowBiaConfigDialog(open);
    if (open) {
      setBiaConfigError(null);
      setBiaConfigNotice(null);
    }
  };

  const updateBiaConfig = (updates) => {
    setBiaConfig((prev) => ({ ...prev, ...updates }));
  };

  const buildBiaTemplateContext = (form) => ({
    form: {
      id: form?.id || '',
      formId: form?.formId || '',
      name: form?.name || '',
      description: form?.description || '',
      version: form?.version || '',
      status: form?.status || ''
    },
    project: {
      id: form?.project?.id || '',
      name: form?.project?.name || ''
    }
  });

  const resolveTemplate = (template, context) => {
    if (!template) return '';
    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
      const value = key.split('.').reduce((acc, part) => {
        if (acc && acc[part] !== undefined && acc[part] !== null) {
          return acc[part];
        }
        return undefined;
      }, context);
      return value !== undefined && value !== null ? String(value) : '';
    });
  };

  const buildBiaPrompt = (form) => {
    const template = biaConfig.promptTemplate?.trim();
    if (template) {
      return resolveTemplate(template, buildBiaTemplateContext(form)).trim();
    }

    const parts = [];
    if (form?.name) parts.push(`Form: ${form.name}`);
    if (form?.description) parts.push(`Description: ${form.description}`);
    if (form?.project?.name) parts.push(`Project: ${form.project.name}`);
    return parts.length > 0 ? parts.join(' | ') : 'Review form intent before publishing.';
  };

  const buildFieldSummary = (fields) => {
    if (!Array.isArray(fields)) return [];
    return fields.map((field) => ({
      field_name: field?.label || field?.name || field?.id || 'field',
      data_type: field?.type || field?.fieldType || 'text',
      required: Boolean(field?.required),
      semantic_hint: field?.helpText || field?.description || field?.placeholder || null
    }));
  };

  const extractBiaDecision = (output) => {
    const rawStatus = output?.status
      || output?.assistant_decision?.status
      || output?.assistantDecision?.status
      || output?.data?.status;
    const rawReason = output?.reason
      || output?.assistant_decision?.reason
      || output?.assistantDecision?.reason
      || output?.data?.reason;
    const rawMessage = output?.message
      || output?.response
      || output?.text
      || output?.data?.message;

    let status = rawStatus ? String(rawStatus).toUpperCase() : '';
    let reason = rawReason ? String(rawReason) : null;

    if (!status && typeof rawMessage === 'string') {
      const upperMessage = rawMessage.toUpperCase();
      if (upperMessage.includes('APPROVED')) {
        status = 'APPROVED';
      }
      if (upperMessage.includes('REJECTED')) {
        status = 'REJECTED';
      }
      if (!reason && rawMessage.includes(':')) {
        reason = rawMessage.split(':').slice(1).join(':').trim() || null;
      }
    }

    return { status, reason, message: rawMessage };
  };

  const extractBiaDecisionFromOutputs = (outputs) => {
    if (!Array.isArray(outputs)) return { status: '', reason: null, message: null, source: null };
    for (const candidate of outputs) {
      if (!candidate) continue;
      const decision = extractBiaDecision(candidate.output || candidate);
      if (decision.status === 'APPROVED' || decision.status === 'REJECTED') {
        return { ...decision, source: candidate.source || null };
      }
    }
    return { status: '', reason: null, message: null, source: null };
  };

  const persistBiaEvaluation = async (form, result, prompt) => {
    if (!form?.id) return;
    const payload = {};
    if (result.status) payload.status = result.status;
    if (result.reason) payload.reason = result.reason;
    if (prompt) payload.prompt = prompt;
    if (result.output) payload.output = result.output;
    if (result.source) payload.source = result.source;
    if (result.message) payload.message = result.message;
    // Save full BIA output with governance package, indicators, etc.
    if (result.biaOutput) payload.biaOutput = result.biaOutput;
    // Save all node executions for full response view
    if (result.nodeExecutions) payload.nodeExecutions = result.nodeExecutions;
    const updatedForm = await dataEntryFormsAPI.saveBiaEvaluation(form.id, payload);
    if (updatedForm) {
      setViewForm((current) => (current?.id === updatedForm.id ? updatedForm : current));
      setSelectedForm((current) => (current?.id === updatedForm.id ? updatedForm : current));
      queryClient.invalidateQueries({ queryKey: ['data-entry-forms'] });
      queryClient.invalidateQueries({ queryKey: ['data-entry-forms-stats'] });
    }
    return updatedForm;
  };

  const runBiaFlow = async (form, options = {}) => {
    const workflowId = biaConfig.workflowId?.trim();
    const apiKey = biaConfig.apiKey?.trim();

    if (!workflowId || !apiKey) {
      throw new Error('Business Indicator Architect Flow is not configured.');
    }

    const prompt = options.prompt?.trim() || buildBiaPrompt(form);
    const fieldSummary = buildFieldSummary(form?.fields);

    const triggerData = {
      form_id: form?.formId || form?.id || null,
      formId: form?.formId || form?.id || null,
      message: prompt,
      prompt,
      user_intent: {
        raw_prompt: prompt
      },
      form_context: {
        form_id: form?.formId || form?.id || null,
        form_name: form?.name || '',
        section_id: null,
        section_name: null,
        schema_summary: {
          fields: fieldSummary
        }
      },
      form: {
        id: form?.id || null,
        formId: form?.formId || null,
        name: form?.name || '',
        description: form?.description || '',
        fields: fieldSummary
      }
    };

    const response = await apiClient.post(
      `/workflows/${workflowId}/execute`,
      { sync: true, triggerData },
      { headers: { 'X-API-Key': apiKey }, skipAuth: true }
    );

    const output = response?.data?.output;
    const nodeExecutions = response?.data?.nodeExecutions || [];
    if (!output && nodeExecutions.length === 0) {
      throw new Error('Business Indicator Architect did not return output.');
    }

    const biaNode = nodeExecutions.find((node) => node?.nodeType?.toLowerCase() === 'businessindicatorarchitect');
    const chatNode = nodeExecutions.find((node) => node?.nodeType?.toLowerCase() === 'chatoutput');
    const decision = extractBiaDecisionFromOutputs([
      biaNode ? { source: 'BusinessIndicatorArchitect', output: biaNode.output } : null,
      output ? { source: 'workflowOutput', output } : null,
      chatNode ? { source: 'ChatOutput', output: chatNode.output } : null
    ]);
    const status = decision.status;
    const reason = decision.reason;

    return {
      approved: status === 'APPROVED',
      status,
      reason,
      message: decision.message,
      source: decision.source,
      output: output || chatNode?.output || biaNode?.output || null,
      // Full BIA node output with governance package, indicators, etc.
      biaOutput: biaNode?.output || null,
      // All node executions for debugging/viewing
      nodeExecutions: nodeExecutions.map(n => ({
        nodeId: n.nodeId,
        nodeType: n.nodeType,
        output: n.output
      }))
    };
  };

  const handleGenerateBiaApiKey = async () => {
    setBiaConfigError(null);
    setBiaConfigNotice(null);

    const workflowId = biaConfig.workflowId?.trim();
    if (!workflowId) {
      setBiaConfigError('Workflow ID is required to generate an API key.');
      return;
    }

    setBiaKeyPending(true);
    try {
      const nameSuffix = workflowId.length >= 8 ? workflowId.slice(0, 8) : workflowId;
      const result = await apiKeysAPI.create({
        name: `Form Studio - BIA Flow ${nameSuffix}`,
        description: 'API key for Business Indicator Architect flow (Form Studio)',
        scopes: ['workflows:execute'],
        workflowIds: [workflowId]
      });
      const apiKey = result?.data?.key;
      if (!apiKey) {
        throw new Error('API key created but the key value was not returned.');
      }
      updateBiaConfig({
        apiKey,
        apiKeyId: result?.data?.id || biaConfig.apiKeyId,
        workflowId
      });
      setBiaConfigNotice('API key created. Store it securely; it will be used for publishing checks.');
    } catch (createError) {
      setBiaConfigError(createError?.message || 'Failed to create API key.');
    } finally {
      setBiaKeyPending(false);
    }
  };

  const handleCopyBiaApiKey = async () => {
    if (!biaConfig.apiKey) return;
    const success = await copyToClipboard(biaConfig.apiKey);
    if (success) {
      setBiaConfigNotice('API key copied to clipboard.');
    } else {
      setBiaConfigError('Unable to copy API key. Please copy it manually.');
    }
  };

  const handleSaveBiaConfig = () => {
    setBiaConfigNotice('Config saved locally.');
    setShowBiaConfigDialog(false);
  };

  const handleRunBiaValidation = (form) => {
    setError(null);
    setBiaValidationNotice(null);

    if (!biaConfig.workflowId?.trim() || !biaConfig.apiKey?.trim()) {
      setError('Business Indicator Architect Flow is not configured. Configure it before validating.');
      setShowBiaConfigDialog(true);
      return;
    }

    setBiaValidationForm(form);
    setBiaValidationPrompt(''); // Start empty, user provides intent
    setShowBiaValidationDialog(true);
  };

  const handleConfirmBiaValidation = async () => {
    if (!biaValidationForm) return;

    setBiaValidationPending(true);
    try {
      const result = await runBiaFlow(biaValidationForm, { prompt: biaValidationPrompt });
      await persistBiaEvaluation(biaValidationForm, result, biaValidationPrompt);
      if (!result.approved) {
        const reasonText = result.reason || result.output?.assistant_decision?.reason || 'Motivo não informado.';
        setError(`Business Indicator Architect rejected this form. Reason: ${reasonText}`);
        return;
      }
      setBiaValidationNotice(`BIA approved form "${biaValidationForm?.name || biaValidationForm?.formId || 'form'}".`);
      setShowBiaValidationDialog(false);
    } catch (biaError) {
      setError(biaError?.message || 'Business Indicator Architect validation failed.');
    } finally {
      setBiaValidationPending(false);
    }
  };

  const handlePublishConfirm = async () => {
    setError(null);
    if (!selectedForm) return;

    if (!biaConfig.workflowId?.trim() || !biaConfig.apiKey?.trim()) {
      setError('Business Indicator Architect Flow is not configured. Configure it before publishing.');
      setShowBiaConfigDialog(true);
      return;
    }

    setBiaPublishPending(true);
    try {
      const result = await runBiaFlow(selectedForm);
      await persistBiaEvaluation(selectedForm, result, buildBiaPrompt(selectedForm));
      if (!result.approved) {
        const reasonText = result.reason || result.output?.assistant_decision?.reason || 'Motivo não informado.';
        setError(`Business Indicator Architect rejected this form. Reason: ${reasonText}`);
        return;
      }
      await publishMutation.mutateAsync({ id: selectedForm.id, changelog });
    } catch (biaError) {
      setError(biaError?.message || 'Business Indicator Architect validation failed.');
    } finally {
      setBiaPublishPending(false);
    }
  };

  // Calculate unique projects from forms
  const projectsWithForms = projects.filter(p =>
    forms.some(f => f.projectId === p.id)
  );

  const isBiaConfigured = Boolean(biaConfig.workflowId?.trim() && biaConfig.apiKey?.trim());

  return (
    <div className="p-6 space-y-6">
      {/* Header Section - Portfolio Style */}
      <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-purple-900 to-indigo-900 text-white px-8 py-7 shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/70 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              Form Studio
            </p>
            <h1 className="text-3xl font-semibold leading-tight">
              Data Entry Forms
            </h1>
            <p className="text-sm text-white/80 mt-3 max-w-3xl">
              Create structured forms for data collection. Define fields, validation rules, and conditional logic.
              Published forms can receive submissions from users or AI agents via API.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="ghost"
              onClick={() => setShowHelpDialog(true)}
              className="bg-white/10 text-white hover:bg-white/20 border border-white/20"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              How it Works
            </Button>
            <Button
              variant="ghost"
              onClick={() => handleBiaConfigOpen(true)}
              className="bg-white/10 text-white hover:bg-white/20 border border-white/20"
              title="Business Indicator Architect Flow"
            >
              <Workflow className="w-4 h-4 mr-2" />
              BIA Flow
            </Button>
            <Button
              variant="ghost"
              onClick={() => refetch()}
              disabled={isFetching}
              className="bg-white/10 text-white hover:bg-white/20 border border-white/20"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={onNewForm}
              className="bg-white text-slate-900 hover:bg-white/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Form
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="rounded-2xl bg-white/10 border border-white/10 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-white/70">Published Forms</p>
              <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </span>
            </div>
            <p className="text-3xl font-semibold mt-3">{stats.published || 0}</p>
            <p className="text-sm text-white/70 mt-1">{stats.draft || 0} in draft</p>
          </div>

          <div className="rounded-2xl bg-white/10 border border-white/10 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-white/70">In Progress</p>
              <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Layers className="w-4 h-4 text-white" />
              </span>
            </div>
            <p className="text-3xl font-semibold mt-3">{stats.draft || 0}</p>
            <p className="text-sm text-white/70 mt-1">{projectsWithForms.length} projects with forms</p>
          </div>

          <div className="rounded-2xl bg-white/10 border border-white/10 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-white/70">Archived</p>
              <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Archive className="w-4 h-4 text-white" />
              </span>
            </div>
            <p className="text-3xl font-semibold mt-3">{stats.deprecated || 0}</p>
            <p className="text-sm text-white/70 mt-1">History preserved</p>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1 mt-6 w-fit">
          <button
            onClick={() => setMainView('forms')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
              mainView === 'forms'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <FileText className="h-4 w-4" />
            Formulários
          </button>
          <button
            onClick={() => setMainView('data')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
              mainView === 'data'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <TableProperties className="h-4 w-4" />
            Lista de Dados
          </button>
        </div>
      </section>

      {mainView === 'forms' && (<>
      {/* Filters Section */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Project Filter */}
            <div className="flex items-center gap-2">
              <Label className="text-xs uppercase tracking-wide text-gray-500 whitespace-nowrap">Project</Label>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or form ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    statusFilter === tab.value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auth Error - Session Expired */}
      {isAuthError && (
        <Alert variant="destructive" className="border-red-500 bg-red-50">
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription className="ml-2">
            <strong className="block text-red-800">Session Expired</strong>
            <span className="text-red-700">
              Your session has expired or is invalid. Please{' '}
              <button
                onClick={() => {
                  localStorage.removeItem('access_token');
                  localStorage.removeItem('refresh_token');
                  window.location.href = '/login';
                }}
                className="underline font-semibold hover:text-red-900"
              >
                login again
              </button>
              {' '}to continue.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Other Errors */}
      {error && !isAuthError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {biaValidationNotice && !error && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{biaValidationNotice}</AlertDescription>
        </Alert>
      )}

      {/* Forms Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isAuthError ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-400" />
              <p className="text-lg font-medium text-red-600">Unable to load forms</p>
              <p className="text-sm mt-1">Your session has expired. Please login again.</p>
              <Button
                variant="destructive"
                onClick={() => {
                  localStorage.removeItem('access_token');
                  localStorage.removeItem('refresh_token');
                  window.location.href = '/login';
                }}
                className="mt-4"
              >
                Go to Login
              </Button>
            </div>
          ) : queryError ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-orange-400" />
              <p className="text-lg font-medium text-orange-600">Error loading forms</p>
              <p className="text-sm mt-1">{queryError.message || 'An unexpected error occurred'}</p>
              <Button variant="outline" onClick={() => refetch()} className="mt-4">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : sortedForms.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileX className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No forms found</p>
              <p className="text-sm mt-1">Create your first form to start collecting data</p>
              <Button variant="default" onClick={onNewForm} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Form
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Name
                      <SortIcon column="name" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="w-[150px] cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('project')}
                  >
                    <div className="flex items-center">
                      Project
                      <SortIcon column="project" />
                    </div>
                  </TableHead>
                  <TableHead className="w-[150px]">
                    <div className="flex items-center">
                      <Database className="h-3 w-3 mr-1" />
                      Target Resource
                    </div>
                  </TableHead>
                  <TableHead className="w-[120px]">
                    Table Name
                  </TableHead>
                  <TableHead
                    className="w-[100px] cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      Status
                      <SortIcon column="status" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="w-[80px] cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('version')}
                  >
                    <div className="flex items-center">
                      Version
                      <SortIcon column="version" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="w-[80px] cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('fields')}
                  >
                    <div className="flex items-center justify-center">
                      Fields
                      <SortIcon column="fields" />
                    </div>
                  </TableHead>
                  <TableHead className="w-[110px]">
                    BIA
                  </TableHead>
                  <TableHead
                    className="w-[100px] cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('submissions')}
                  >
                    <div className="flex items-center justify-center">
                      Submissions
                      <SortIcon column="submissions" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="w-[150px] cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('updatedAt')}
                  >
                    <div className="flex items-center">
                      Updated
                      <SortIcon column="updatedAt" />
                    </div>
                  </TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedForms.map((form) => {
                  const statusConfig = STATUS_CONFIG[form.status] || STATUS_CONFIG.DRAFT;
                  const StatusIcon = statusConfig.icon;
                  const fieldsCount = Array.isArray(form.fields) ? form.fields.length : 0;
                  const biaStatus = String(form?.biaStatus || form?.biaEvaluation?.status || '').toUpperCase();
                  const biaLabel = biaStatus || 'NOT EVALUATED';

                  return (
                    <TableRow key={form.id} className="cursor-pointer hover:bg-gray-50" onClick={() => onEditForm?.(form)}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{form.name}</p>
                          {form.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 max-w-[300px]">{form.description}</p>
                          )}
                          <p className="text-[10px] text-gray-400 font-mono">{form.formId}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {form.project ? (
                          <Badge variant="outline" className="text-xs">
                            <FolderKanban className="w-3 h-3 mr-1" />
                            {form.project.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {form.resource ? (
                          <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200">
                            <Database className="w-3 h-3 mr-1 text-blue-500" />
                            {form.resource.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {form.targetConfig?.tableName ? (
                          <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                            {form.targetConfig.tableName}
                          </code>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">v{form.version}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {fieldsCount}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getBiaBadgeVariant(biaStatus)}
                          className={getBiaBadgeClass(biaStatus)}
                        >
                          {biaLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {form._count?.submissions || 0}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(form.updatedAt), {
                          addSuffix: true,
                          locale: enUS
                        })}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {form.status === 'DRAFT' && (
                              <DropdownMenuItem onClick={() => onEditForm?.(form)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleViewForm(form)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            {(form.status === 'PUBLISHED' || form.status === 'TESTING') && (
                              <DropdownMenuItem onClick={() => { setDataForm(form); setShowDataDialog(true); }}>
                                <Database className="h-4 w-4 mr-2" />
                                Ver Dados
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleRunBiaValidation(form)}
                              disabled={biaValidationPending}
                            >
                              <Workflow className="h-4 w-4 mr-2" />
                              {biaValidationPending ? 'Validating...' : 'Validate (BIA)'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {form.status === 'DRAFT' && (
                              <DropdownMenuItem onClick={() => handlePublish(form)}>
                                <Send className="h-4 w-4 mr-2" />
                                Publish
                              </DropdownMenuItem>
                            )}
                            {form.status === 'PUBLISHED' && (
                              <>
                                <DropdownMenuItem onClick={() => unpublishMutation.mutate(form.id)}>
                                  <Undo2 className="h-4 w-4 mr-2" />
                                  Unpublish
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => deprecateMutation.mutate(form.id)}>
                                  <Archive className="h-4 w-4 mr-2" />
                                  Deprecate
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => newVersionMutation.mutate(form.id)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  New Version
                                </DropdownMenuItem>
                              </>
                            )}
                            {form.status === 'DEPRECATED' && (
                              <DropdownMenuItem onClick={() => newVersionMutation.mutate(form.id)}>
                                <Copy className="h-4 w-4 mr-2" />
                                New Version
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {form.status !== 'PUBLISHED' && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(form)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </>)}

      {/* Data Browser View */}
      {mainView === 'data' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TableProperties className="h-5 w-5" />
              Lista de Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Form Selector */}
              <Select value={dbSelectedFormId || '_none_'} onValueChange={(v) => handleDbFormChange(v === '_none_' ? '' : v)}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Selecione um formulário..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_" disabled>Selecione um formulário...</SelectItem>
                  {dbForms.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      <span className="flex items-center gap-2">
                        {f.name}
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{f._count?.submissions || 0}</Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Key Field Search */}
              {dbSelectedForm && (
                <>
                  <Select value={dbSearchField || '_none_'} onValueChange={(v) => setDbSearchField(v === '_none_' ? '' : v)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Campo de busca..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">Todos os campos</SelectItem>
                      {dbFields.map((f) => (
                        <SelectItem key={f.name} value={f.name}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="relative flex-1 flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={dbSearchField ? `Buscar por ${dbFields.find(f => f.name === dbSearchField)?.label || dbSearchField}...` : 'Buscar...'}
                        value={dbSearchValue}
                        onChange={(e) => setDbSearchValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && dbSearchField && dbSearchValue) handleDbSearch(); }}
                        className="pl-10"
                        disabled={!dbSearchField}
                      />
                    </div>
                    <Button
                      onClick={handleDbSearch}
                      disabled={!dbSearchField || !dbSearchValue}
                      size="sm"
                    >
                      Buscar
                    </Button>
                    {dbActiveSearch.field && (
                      <Button variant="ghost" size="icon" onClick={handleDbClearSearch}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <Button variant="outline" size="icon" onClick={() => dbRefetch()} disabled={dbSubmissionsFetching}>
                    <RefreshCw className={`h-4 w-4 ${dbSubmissionsFetching ? 'animate-spin' : ''}`} />
                  </Button>

                  <Button size="sm" onClick={() => { setDbEditSubmission(null); setDbMutationError(null); setDbShowFormDialog(true); }}>
                    <Plus className="h-4 w-4 mr-1" />
                    Novo
                  </Button>
                </>
              )}
            </div>

            {/* Active search indicator */}
            {dbActiveSearch.field && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Search className="h-3 w-3" />
                Buscando por <strong>{dbFields.find(f => f.name === dbActiveSearch.field)?.label || dbActiveSearch.field}</strong> = "<strong>{dbActiveSearch.value}</strong>"
                <Button variant="ghost" size="sm" className="h-5 px-1" onClick={handleDbClearSearch}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* No form selected */}
            {!dbSelectedFormId && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Database className="h-12 w-12 mb-4 opacity-30" />
                <p className="text-lg font-medium">Selecione um formulário</p>
                <p className="text-sm">Escolha um formulário publicado para visualizar seus dados</p>
              </div>
            )}

            {/* Loading */}
            {dbSelectedFormId && dbSubmissionsLoading && (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Empty state */}
            {dbSelectedFormId && !dbSubmissionsLoading && dbSubmissions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileX className="h-10 w-10 mb-3 opacity-30" />
                <p className="font-medium">Nenhum registro encontrado</p>
                {dbActiveSearch.field && <p className="text-sm">Tente ajustar os filtros de busca</p>}
              </div>
            )}

            {/* Data Table */}
            {dbSelectedFormId && !dbSubmissionsLoading && dbSortedSubmissions.length > 0 && (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead
                          className="w-[100px] cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleDbSort('status')}
                        >
                          <div className="flex items-center gap-1">
                            Status
                            {dbSortField === 'status' ? (dbSortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                          </div>
                        </TableHead>
                        {dbFields.slice(0, 6).map((field) => (
                          <TableHead
                            key={field.name}
                            className="cursor-pointer hover:bg-gray-100 select-none max-w-[200px]"
                            onClick={() => handleDbSort(field.name)}
                          >
                            <div className="flex items-center gap-1">
                              <span className="truncate">{field.label}</span>
                              {dbSortField === field.name ? (dbSortDir === 'asc' ? <ArrowUp className="h-3 w-3 shrink-0" /> : <ArrowDown className="h-3 w-3 shrink-0" />) : <ArrowUpDown className="h-3 w-3 opacity-30 shrink-0" />}
                            </div>
                          </TableHead>
                        ))}
                        <TableHead
                          className="w-[130px] cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleDbSort('submittedAt')}
                        >
                          <div className="flex items-center gap-1">
                            Enviado
                            {dbSortField === 'submittedAt' ? (dbSortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                          </div>
                        </TableHead>
                        <TableHead className="w-[80px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dbSortedSubmissions.map((sub) => {
                        const statusCfg = SUBMISSION_STATUS[sub.status] || SUBMISSION_STATUS.pending;
                        return (
                          <TableRow key={sub.id}>
                            <TableCell>
                              <Badge variant={statusCfg.variant} className="text-[11px]">{statusCfg.label}</Badge>
                            </TableCell>
                            {dbFields.slice(0, 6).map((field) => {
                              const val = sub.data?.[field.name];
                              const display = val === null || val === undefined ? '-' :
                                typeof val === 'boolean' ? (val ? 'Sim' : 'Não') :
                                String(val).length > 40 ? String(val).substring(0, 40) + '...' : String(val);
                              return (
                                <TableCell key={field.name} className="max-w-[200px]">
                                  <span className="truncate block">{display}</span>
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-muted-foreground text-sm">
                              {sub.submittedAt ? formatDistanceToNow(new Date(sub.submittedAt), { addSuffix: true, locale: enUS }) : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDbViewSubmission(sub)}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setDbEditSubmission(sub); setDbMutationError(null); setDbShowFormDialog(true); }}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{dbPagination.total} registro{dbPagination.total !== 1 ? 's' : ''}</span>
                  {dbTotalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={dbPage === 0} onClick={() => setDbPage(dbPage - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span>Página {dbPage + 1} de {dbTotalPages}</span>
                      <Button variant="outline" size="sm" disabled={dbPage >= dbTotalPages - 1} onClick={() => setDbPage(dbPage + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Data Browser: View Submission Dialog */}
      <Dialog open={!!dbViewSubmission} onOpenChange={(open) => { if (!open) setDbViewSubmission(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Registro</DialogTitle>
            <DialogDescription>
              {dbViewSubmission?.status && (
                <Badge variant={SUBMISSION_STATUS[dbViewSubmission.status]?.variant || 'secondary'} className="mr-2">
                  {SUBMISSION_STATUS[dbViewSubmission.status]?.label || dbViewSubmission.status}
                </Badge>
              )}
              {dbViewSubmission?.submittedAt && `Enviado ${formatDistanceToNow(new Date(dbViewSubmission.submittedAt), { addSuffix: true, locale: enUS })}`}
            </DialogDescription>
          </DialogHeader>
          {dbViewSubmission && (
            <div className="space-y-3">
              {dbFields.map((field) => {
                const val = dbViewSubmission.data?.[field.name];
                return (
                  <div key={field.name} className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">{field.label}</label>
                    <div className="p-2 bg-muted rounded-md text-sm">
                      {val === null || val === undefined ? <span className="text-muted-foreground italic">-</span> :
                       typeof val === 'boolean' ? (val ? 'Sim' : 'Não') : String(val)}
                    </div>
                  </div>
                );
              })}
              {dbViewSubmission.validationErrors?.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {dbViewSubmission.validationErrors.map((e, i) => <div key={i}>{e.field}: {e.message}</div>)}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Data Browser: Create/Edit Submission Dialog */}
      <Dialog open={dbShowFormDialog} onOpenChange={(open) => { if (!open) { setDbShowFormDialog(false); setDbEditSubmission(null); setDbMutationError(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dbEditSubmission ? 'Editar Registro' : 'Novo Registro'}
              {dbSelectedForm && <span className="text-muted-foreground font-normal ml-2">- {dbSelectedForm.name}</span>}
            </DialogTitle>
          </DialogHeader>
          {dbMutationError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{dbMutationError}</AlertDescription>
            </Alert>
          )}
          {dbSelectedForm && (
            <FormPreview
              formName=""
              formDescription=""
              fields={dbSelectedForm.fields || []}
              initialValues={dbEditSubmission?.data || null}
              submitLabel={dbEditSubmission ? 'Salvar' : 'Enviar'}
              onSubmit={handleDbFormSubmit}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Form</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the form "{selectedForm?.name}"?
              This action cannot be undone and all submissions will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteMutation.mutate(selectedForm?.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              <Label>Form</Label>
              <p className="text-sm font-medium">{selectedForm?.name}</p>
              <p className="text-xs text-muted-foreground">Version {selectedForm?.version}</p>
            </div>
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
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Business Indicator Architect Flow</p>
                  <p className={`text-xs ${isBiaConfigured ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {isBiaConfigured
                      ? 'Configured for pre-publish approval.'
                      : 'Not configured. Publishing will be blocked.'}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleBiaConfigOpen(true)}>
                  Configure
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePublishConfirm}
              disabled={!isBiaConfigured || publishMutation.isPending || biaPublishPending}
            >
              {biaPublishPending
                ? 'Validating...'
                : publishMutation.isPending
                  ? 'Publishing...'
                  : 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Form Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-5xl w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View Form</DialogTitle>
            <DialogDescription>
              Review form details and the latest BIA evaluation.
            </DialogDescription>
          </DialogHeader>

          {/* BIA Evaluation Summary Header */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Last BIA Evaluation</p>
                <p className="text-xs text-muted-foreground">
                  {formatBiaTimestamp(viewForm?.biaEvaluatedAt || viewForm?.biaEvaluation?.evaluatedAt)}
                </p>
              </div>
              <Badge
                variant={getBiaBadgeVariant(String(viewForm?.biaStatus || '').toUpperCase())}
                className={getBiaBadgeClass(String(viewForm?.biaStatus || '').toUpperCase())}
              >
                {viewForm?.biaStatus ? String(viewForm?.biaStatus).toUpperCase() : 'NOT EVALUATED'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {viewForm?.biaReason
                || viewForm?.biaEvaluation?.reason
                || viewForm?.biaEvaluation?.message
                || 'No evaluation details available.'}
            </p>
          </div>

          {/* Tabs for Preview, BIA Response, Data */}
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="bia-response">BIA Response</TabsTrigger>
              <TabsTrigger value="data">Form Data</TabsTrigger>
            </TabsList>

            {/* Preview Tab */}
            <TabsContent value="preview" className="mt-4">
              <FormPreview
                formName={viewForm?.name}
                formDescription={viewForm?.description}
                fields={viewForm?.fields || []}
              />
            </TabsContent>

            {/* BIA Response Tab */}
            <TabsContent value="bia-response" className="mt-4">
              {(viewForm?.biaEvaluation?.biaOutput || viewForm?.biaEvaluation?.output || viewForm?.biaEvaluation) ? (
                <div className="space-y-4">
                  {/* BIA Analysis Output - Governance Package & Indicators */}
                  {viewForm?.biaEvaluation?.biaOutput && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-purple-600" />
                          BIA Analysis (Governance Package)
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(JSON.stringify(viewForm?.biaEvaluation?.biaOutput, null, 2))}
                        >
                          <Copy className="h-4 w-4 mr-1" /> Copy
                        </Button>
                      </div>
                      {/* Quick overview of BIA output */}
                      {(() => {
                        const bia = viewForm?.biaEvaluation?.biaOutput;
                        const indicators = bia?.indicators || bia?.governance_package?.indicators || [];
                        const governance = bia?.governance_package || bia?.governance || {};
                        return (
                          <div className="space-y-3 mb-3">
                            {indicators.length > 0 && (
                              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                <p className="text-xs font-medium text-purple-700 mb-2">Indicators ({indicators.length})</p>
                                <div className="flex flex-wrap gap-2">
                                  {indicators.slice(0, 8).map((ind, i) => (
                                    <Badge key={i} variant="outline" className="text-xs bg-white">
                                      {ind?.name || ind?.indicator_name || ind?.label || `Indicator ${i + 1}`}
                                    </Badge>
                                  ))}
                                  {indicators.length > 8 && (
                                    <Badge variant="secondary" className="text-xs">+{indicators.length - 8} more</Badge>
                                  )}
                                </div>
                              </div>
                            )}
                            {(governance?.rules || governance?.policies) && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-xs font-medium text-blue-700">
                                  Governance: {governance?.rules?.length || 0} rules, {governance?.policies?.length || 0} policies
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      <ResizableJsonBox
                        data={viewForm?.biaEvaluation?.biaOutput}
                        defaultHeight={280}
                        maxHeight={800}
                      />
                    </div>
                  )}

                  {/* Node Executions - All workflow nodes */}
                  {viewForm?.biaEvaluation?.nodeExecutions?.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="flex items-center gap-2">
                          <Workflow className="h-4 w-4 text-blue-600" />
                          Node Executions ({viewForm?.biaEvaluation?.nodeExecutions?.length})
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(JSON.stringify(viewForm?.biaEvaluation?.nodeExecutions, null, 2))}
                        >
                          <Copy className="h-4 w-4 mr-1" /> Copy
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {viewForm?.biaEvaluation?.nodeExecutions.map((node, idx) => (
                          <details key={idx} className="bg-slate-50 border rounded-lg group">
                            <summary className="px-3 py-2 cursor-pointer hover:bg-slate-100 flex items-center justify-between">
                              <span className="font-medium text-sm">{node.nodeType}</span>
                              <Badge variant="outline" className="text-xs">{node.nodeId?.slice(0, 8)}...</Badge>
                            </summary>
                            <div className="p-2">
                              <ResizableJsonBox
                                data={node.output}
                                defaultHeight={200}
                                maxHeight={500}
                                minHeight={100}
                              />
                            </div>
                          </details>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Final Output (ChatOutput) */}
                  {viewForm?.biaEvaluation?.output && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-600" />
                          Final Output
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(JSON.stringify(viewForm?.biaEvaluation?.output, null, 2))}
                        >
                          <Copy className="h-4 w-4 mr-1" /> Copy
                        </Button>
                      </div>
                      <ResizableJsonBox
                        data={viewForm?.biaEvaluation?.output}
                        defaultHeight={180}
                        maxHeight={400}
                      />
                    </div>
                  )}

                  {/* Fallback if no structured data */}
                  {!viewForm?.biaEvaluation?.biaOutput && !viewForm?.biaEvaluation?.nodeExecutions?.length && !viewForm?.biaEvaluation?.output && (
                    <div>
                      <Label>Raw BIA Evaluation</Label>
                      <div className="mt-2">
                        <ResizableJsonBox
                          data={viewForm?.biaEvaluation}
                          defaultHeight={300}
                          maxHeight={600}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No BIA evaluation data available.</p>
                  <p className="text-sm mt-1">Run a BIA validation to see the response here.</p>
                </div>
              )}
            </TabsContent>

            {/* Form Data Tab */}
            <TabsContent value="data" className="mt-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Form Schema</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const data = {
                        id: viewForm?.id,
                        formId: viewForm?.formId,
                        name: viewForm?.name,
                        description: viewForm?.description,
                        version: viewForm?.version,
                        status: viewForm?.status,
                        fields: viewForm?.fields,
                        biaStatus: viewForm?.biaStatus,
                        biaEvaluatedAt: viewForm?.biaEvaluatedAt
                      };
                      copyToClipboard(JSON.stringify(data, null, 2));
                    }}
                  >
                    <Copy className="h-4 w-4 mr-1" /> Copy
                  </Button>
                </div>
                <ResizableJsonBox
                  data={{
                    id: viewForm?.id,
                    formId: viewForm?.formId,
                    name: viewForm?.name,
                    description: viewForm?.description,
                    version: viewForm?.version,
                    status: viewForm?.status,
                    fields: viewForm?.fields,
                    biaStatus: viewForm?.biaStatus,
                    biaEvaluatedAt: viewForm?.biaEvaluatedAt
                  }}
                  defaultHeight={350}
                  maxHeight={700}
                />
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Business Indicator Architect Config */}
      <Dialog open={showBiaConfigDialog} onOpenChange={handleBiaConfigOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Business Indicator Architect Flow</DialogTitle>
            <DialogDescription>
              Configure the workflow and API key used to validate forms before publishing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Workflow ID</Label>
              <Input
                value={biaConfig.workflowId}
                onChange={(e) => updateBiaConfig({ workflowId: e.target.value })}
                placeholder="workflow_id"
                className="mt-1"
              />
            </div>
            <div>
              <Label>API Key</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  type="password"
                  value={biaConfig.apiKey}
                  onChange={(e) => updateBiaConfig({ apiKey: e.target.value })}
                  placeholder="Paste API key"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyBiaApiKey}
                  disabled={!biaConfig.apiKey}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Stored locally in this browser. Keep it secure.
              </p>
            </div>
            <div>
              <Label>Prompt Template (optional)</Label>
              <Textarea
                value={biaConfig.promptTemplate}
                onChange={(e) => updateBiaConfig({ promptTemplate: e.target.value })}
                className="mt-1"
                rows={3}
                placeholder="Example: Review {{form.name}} - {{form.description}}"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Available variables: {'{{form.name}}'}, {'{{form.description}}'}, {'{{form.formId}}'}, {'{{project.name}}'}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Generate API Key</p>
                <p className="text-xs text-muted-foreground">
                  Creates a key scoped to this workflow with execute permissions.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateBiaApiKey}
                disabled={biaKeyPending || !biaConfig.workflowId?.trim()}
              >
                {biaKeyPending ? 'Generating...' : 'Generate'}
              </Button>
            </div>
            {biaConfigError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{biaConfigError}</AlertDescription>
              </Alert>
            )}
            {biaConfigNotice && (
              <Alert>
                <AlertDescription>{biaConfigNotice}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleBiaConfigOpen(false)}>
              Close
            </Button>
            <Button onClick={handleSaveBiaConfig}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Business Indicator Architect Validation */}
      <Dialog open={showBiaValidationDialog} onOpenChange={setShowBiaValidationDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Validate with BIA Flow</DialogTitle>
            <DialogDescription>
              Analyze business intent and governance rules before publishing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Form Info */}
            <div className="rounded-lg border bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{biaValidationForm?.name}</p>
                  <p className="text-xs text-muted-foreground">{biaValidationForm?.formId}</p>
                  {biaValidationForm?.description && (
                    <p className="text-sm text-muted-foreground mt-1">{biaValidationForm.description}</p>
                  )}
                </div>
                <Badge variant="outline">{biaValidationForm?.fields?.length || 0} fields</Badge>
              </div>
            </div>

            {/* Form Fields Summary */}
            {biaValidationForm?.fields?.length > 0 && (
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium mb-2">Form Fields</p>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {biaValidationForm.fields.slice(0, 10).map((field, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <span className="font-medium truncate">{field.label || field.name || `Field ${idx + 1}`}</span>
                      <Badge variant="secondary" className="text-[10px] px-1">
                        {field.type || field.fieldType || 'text'}
                      </Badge>
                      {field.required && <span className="text-red-500">*</span>}
                    </div>
                  ))}
                  {biaValidationForm.fields.length > 10 && (
                    <p className="text-xs text-muted-foreground col-span-2">
                      +{biaValidationForm.fields.length - 10} more fields...
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Business Prompt */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Label>Business Intent Prompt</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-sm p-3">
                      <p className="font-medium mb-2">Prompt Examples:</p>
                      <ul className="text-xs space-y-2">
                        <li><strong>Satisfaction Survey:</strong> Identify customer satisfaction KPIs, NPS indicators, and service quality metrics.</li>
                        <li><strong>Sales Form:</strong> Track sales performance indicators, conversion rates, and revenue metrics.</li>
                        <li><strong>Support Ticket:</strong> Measure response time, resolution rate, and customer effort score.</li>
                        <li><strong>Employee Feedback:</strong> Analyze engagement levels, retention indicators, and team performance.</li>
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Describe what business indicators (KPI, IC, IV) should be derived from this form.
              </p>
              <Textarea
                value={biaValidationPrompt}
                onChange={(e) => setBiaValidationPrompt(e.target.value)}
                className="mt-1"
                rows={4}
                placeholder="Enter your business intent here..."
              />
            </div>

            {/* What will be analyzed */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
              <p className="font-medium text-blue-900 mb-1">What BIA will analyze:</p>
              <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>Business intent normalization (decision focus, scope)</li>
                <li>Governance rules (allowed indicator types, naming)</li>
                <li>Token & cost estimation for LLM operations</li>
                <li>Safety rules and semantic validation</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBiaValidationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmBiaValidation} disabled={biaValidationPending}>
              {biaValidationPending ? 'Validating...' : 'Validate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Help Dialog - Assistants Style */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <BookOpen className="h-6 w-6 text-violet-600" />
              Form Studio - Complete Guide
            </DialogTitle>
            <DialogDescription>
              Learn how to create structured data collection forms with validation and API integration
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* What are Forms */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                What are Data Entry Forms?
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                <strong>Data Entry Forms</strong> are structured templates for collecting information. They can be used by humans
                through a visual interface or by AI agents via API. Forms ensure data consistency, validation,
                and can automatically write to databases or trigger workflows.
              </p>
            </div>

            <div className="border-l-4 border-violet-500 pl-4 bg-violet-50 p-4 rounded-r-lg">
              <p className="text-sm text-gray-700">
                <strong>Practical Example:</strong> A "Customer Feedback" form with fields for rating, comments, and email.
                When submitted via API, data is validated and written directly to a database table for analysis.
              </p>
            </div>

            <div className="h-px bg-gray-200" />

            {/* Key Configuration */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-500" />
                Key Configurations
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <FolderKanban className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-blue-900">Project</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Every form must belong to a project. This enables access control, organization,
                          and filtering by team or business unit.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Layout className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-purple-900">Sections</h4>
                        <p className="text-sm text-purple-700 mt-1">
                          <strong>Required before adding fields.</strong> Sections organize fields into logical groups
                          with titles and descriptions. Can be collapsible.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-red-900">Validation Rules</h4>
                        <p className="text-sm text-red-700 mt-1">
                          Regex patterns, min/max values, required fields, and custom error messages.
                          Validated on frontend and API submissions.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Zap className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-green-900">Conditional Display</h4>
                        <p className="text-sm text-green-700 mt-1">
                          Show or hide fields based on other field values. Create dynamic forms
                          that adapt to user input in real-time.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="h-px bg-gray-200" />

            {/* Field Types */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-orange-500" />
                Available Field Types
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                  <Type className="h-4 w-4 text-gray-600" />
                  <div>
                    <h4 className="font-semibold text-sm">Text / Long Text</h4>
                    <p className="text-xs text-gray-600">Single line or multi-line text input with length limits</p>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                  <Hash className="h-4 w-4 text-gray-600" />
                  <div>
                    <h4 className="font-semibold text-sm">Number</h4>
                    <p className="text-xs text-gray-600">Numeric values with min/max and decimal places</p>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                  <Clock className="h-4 w-4 text-gray-600" />
                  <div>
                    <h4 className="font-semibold text-sm">Date / DateTime</h4>
                    <p className="text-xs text-gray-600">Date pickers with format and range validation</p>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                  <ToggleLeft className="h-4 w-4 text-gray-600" />
                  <div>
                    <h4 className="font-semibold text-sm">Select / Radio / Checkbox</h4>
                    <p className="text-xs text-gray-600">Option lists, single/multiple selection, toggles</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-200" />

            {/* Publishing Workflow */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Send className="h-5 w-5 text-emerald-500" />
                Publishing & Version Control
              </h3>
              <p className="text-sm text-gray-600">
                Forms go through a lifecycle that ensures data integrity:
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Draft</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Form is editable. Add sections, fields, validation rules. Not accepting submissions yet.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Published</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Schema is frozen. Form accepts submissions via UI or API. Can add changelog notes.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Deprecated / New Version</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Deprecate to stop submissions while keeping history. Create "New Version" to fork and edit.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-200" />

            {/* API Integration */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Code className="h-5 w-5 text-indigo-500" />
                API Integration
              </h3>
              <p className="text-sm text-gray-600">
                Published forms expose REST endpoints for programmatic access:
              </p>
              <div className="bg-gray-900 rounded-lg p-4 text-sm font-mono">
                <p className="text-green-400">// Get form schema (for AI agents)</p>
                <p className="text-white">GET /api/v1/data-entry-forms/:id/schema</p>
                <p className="text-green-400 mt-3">// Submit form data</p>
                <p className="text-white">POST /api/v1/data-entry-forms/:id/submit</p>
                <p className="text-yellow-300 ml-4">{'{'}</p>
                <p className="text-yellow-300 ml-8">"field_name": "value",</p>
                <p className="text-yellow-300 ml-8">"another_field": 123</p>
                <p className="text-yellow-300 ml-4">{'}'}</p>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Use API Keys with appropriate scopes for authentication. AI agents can fetch schema to understand field requirements.
              </p>
            </div>

            <div className="h-px bg-gray-200" />

            {/* How Forms are Used */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Workflow className="h-5 w-5 text-pink-500" />
                How Forms are Used in Workflows
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Data Entry Forms integrate with other system components:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <h4 className="font-semibold">AI Agent Submissions</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Agents fetch schema, extract data from conversations, and submit structured JSON
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="pt-4">
                    <h4 className="font-semibold">Database Integration</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Configure target tables and write strategies (INSERT, UPSERT, UPDATE)
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-purple-500">
                  <CardContent className="pt-4">
                    <h4 className="font-semibold">Workflow Triggers</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Form submissions can trigger automated workflows for processing
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500">
                  <CardContent className="pt-4">
                    <h4 className="font-semibold">Submissions History</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      View, export, and analyze all submissions in the Form Studio
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Pro Tips */}
            <div className="border-l-4 border-amber-500 pl-4 bg-amber-50 p-4 rounded-r-lg">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900 mb-2">Pro Tips</p>
                  <ul className="text-sm text-amber-800 space-y-1">
                    <li>• Always add a Section first - fields cannot be added without one</li>
                    <li>• Use Preview to test validation and conditional logic before publishing</li>
                    <li>• Add Context Hints to help AI agents understand field purposes</li>
                    <li>• Export forms as JSON for backup or template sharing</li>
                    <li>• Use meaningful field names - they become JSON keys in API responses</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowHelpDialog(false)}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Data Management Dialog */}
      <Dialog open={showDataDialog} onOpenChange={(open) => {
        if (!open) { setShowDataDialog(false); setDataForm(null); }
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {dataForm?.name} - Dados
            </DialogTitle>
            <DialogDescription className="flex items-center gap-3">
              <span>Consulte, insira ou edite registros deste formulário</span>
              {dataForm?.resource && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Database className="h-3 w-3" />
                  {dataForm.resource.name}
                  {dataForm.targetConfig?.tableName && ` → ${dataForm.targetConfig.tableName}`}
                </Badge>
              )}
            </DialogDescription>
          </DialogHeader>
          {dataForm && (
            <SubmissionsViewer
              formId={dataForm.id}
              formName={dataForm.name}
              fields={(dataForm.fields || []).filter(f => f.type !== 'section')}
              allFields={dataForm.fields || []}
              hasDataSource={!!dataForm.resourceId}
              resourceLabel={dataForm.resource ? `${dataForm.resource.name}${dataForm.targetConfig?.tableName ? ` → ${dataForm.targetConfig.tableName}` : ''}` : null}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
