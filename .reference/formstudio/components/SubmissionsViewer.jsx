import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  RefreshCw,
  Eye,
  Pencil,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  FileJson,
  Download,
  Database
} from 'lucide-react';
import { dataEntryFormsAPI } from '@/api/data-entry-forms';
import { FormPreview } from '@/components/form-studio';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    variant: 'secondary',
    icon: Clock
  },
  validated: {
    label: 'Validated',
    variant: 'default',
    icon: CheckCircle2
  },
  written: {
    label: 'Written',
    variant: 'success',
    icon: CheckCircle2
  },
  error: {
    label: 'Error',
    variant: 'destructive',
    icon: XCircle
  }
};

export default function SubmissionsViewer({ formId, formName, fields = [], allFields, hasDataSource = true, resourceLabel }) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [page, setPage] = useState(0);
  const limit = 20;

  // Create/Edit form dialog
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState(null);
  const [mutationError, setMutationError] = useState(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['form-submissions', formId, statusFilter, page],
    queryFn: () => dataEntryFormsAPI.getSubmissions(formId, {
      status: statusFilter !== 'all' ? statusFilter : undefined,
      limit,
      offset: page * limit
    }),
    enabled: !!formId,
    staleTime: 30_000
  });

  const submissions = data?.data || [];
  const pagination = data?.pagination || { total: 0 };
  const totalPages = Math.ceil(pagination.total / limit);

  const submitMutation = useMutation({
    mutationFn: (values) => dataEntryFormsAPI.submit(formId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-submissions', formId] });
      setShowFormDialog(false);
      setEditingSubmission(null);
      setMutationError(null);
    },
    onError: (error) => {
      setMutationError(error?.data?.error || error?.message || 'Failed to submit');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ submissionId, values }) =>
      dataEntryFormsAPI.updateSubmission(formId, submissionId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-submissions', formId] });
      setShowFormDialog(false);
      setEditingSubmission(null);
      setMutationError(null);
    },
    onError: (error) => {
      setMutationError(error?.data?.error || error?.message || 'Failed to update');
    }
  });

  const handleOpenNew = () => {
    setEditingSubmission(null);
    setMutationError(null);
    setShowFormDialog(true);
  };

  const handleOpenEdit = (submission) => {
    setEditingSubmission(submission);
    setMutationError(null);
    setShowFormDialog(true);
  };

  const handleFormSubmit = async (values) => {
    if (editingSubmission) {
      await updateMutation.mutateAsync({ submissionId: editingSubmission.id, values });
    } else {
      await submitMutation.mutateAsync(values);
    }
  };

  const handleExportJson = () => {
    const exportData = submissions.map(s => ({
      id: s.id,
      data: s.data,
      status: s.status,
      submittedAt: s.submittedAt,
      submittedBy: s.submittedBy
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `submissions-${formId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    if (submissions.length === 0) return;

    // Get all unique keys from all submissions
    const allKeys = new Set();
    submissions.forEach(s => {
      Object.keys(s.data || {}).forEach(k => allKeys.add(k));
    });
    const keys = Array.from(allKeys);

    // Build CSV
    const headers = ['id', 'status', 'submittedAt', ...keys];
    const rows = submissions.map(s => {
      const dataValues = keys.map(k => {
        const val = s.data?.[k];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val).replace(/"/g, '""');
      });
      return [
        s.id,
        s.status,
        s.submittedAt,
        ...dataValues
      ].map(v => `"${v}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `submissions-${formId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formFieldsForPreview = allFields || fields;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Submissions
              {resourceLabel && (
                <Badge variant="outline" className="gap-1 text-xs font-normal">
                  <Database className="h-3 w-3" />
                  {resourceLabel}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {pagination.total} submission{pagination.total !== 1 ? 's' : ''} received
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleOpenNew}>
              <Plus className="h-4 w-4 mr-1" />
              Novo Registro
            </Button>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="validated">Validated</SelectItem>
                <SelectItem value="written">Written</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={submissions.length === 0}>
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportJson} disabled={submissions.length === 0}>
              <FileJson className="h-4 w-4 mr-1" />
              JSON
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasDataSource && (
          <Alert variant="warning" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Este formulário não possui um Target Resource (DB) configurado. Os dados serão salvos apenas localmente no OrchestratorAI. Configure um destino na aba <strong>Data</strong> do editor para sincronizar com um banco externo.
            </AlertDescription>
          </Alert>
        )}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileJson className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No submissions found</p>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead>Data Preview</TableHead>
                    <TableHead className="w-[150px]">Submitted</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => {
                    const statusConfig = STATUS_CONFIG[submission.status] || STATUS_CONFIG.pending;
                    const StatusIcon = statusConfig.icon;
                    const dataPreview = Object.entries(submission.data || {})
                      .slice(0, 3)
                      .map(([k, v]) => `${k}: ${String(v).substring(0, 20)}`)
                      .join(' | ');

                    return (
                      <TableRow key={submission.id}>
                        <TableCell>
                          <Badge variant={statusConfig.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground max-w-md truncate">
                          {dataPreview || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(submission.submittedAt), {
                            addSuffix: true,
                            locale: enUS
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedSubmission(submission)}
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(submission)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
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
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Submission Detail Dialog */}
        <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Submission Details
                {selectedSubmission && (
                  <Badge variant={STATUS_CONFIG[selectedSubmission.status]?.variant}>
                    {STATUS_CONFIG[selectedSubmission.status]?.label}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            {selectedSubmission && (
              <Tabs defaultValue="data">
                <TabsList>
                  <TabsTrigger value="data">Data</TabsTrigger>
                  <TabsTrigger value="meta">Metadata</TabsTrigger>
                  {selectedSubmission.validationErrors && (
                    <TabsTrigger value="errors" className="text-destructive">
                      Errors ({selectedSubmission.validationErrors.length})
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="data">
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4 pr-4">
                      {fields.length > 0 ? (
                        fields.map(field => {
                          const value = selectedSubmission.data?.[field.name];
                          return (
                            <div key={field.name} className="space-y-1">
                              <label className="text-sm font-medium">{field.label}</label>
                              <div className="p-2 bg-muted rounded-md text-sm">
                                {value !== undefined && value !== null && value !== ''
                                  ? typeof value === 'object'
                                    ? JSON.stringify(value)
                                    : String(value)
                                  : <span className="text-muted-foreground italic">Empty</span>
                                }
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <pre className="p-4 bg-muted rounded-md text-sm font-mono overflow-auto">
                          {JSON.stringify(selectedSubmission.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="meta">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">ID</label>
                        <p className="text-sm font-mono text-muted-foreground">{selectedSubmission.id}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Form Version</label>
                        <p className="text-sm">{selectedSubmission.formVersion}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Submitted At</label>
                        <p className="text-sm">{new Date(selectedSubmission.submittedAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Submitted By</label>
                        <p className="text-sm font-mono">{selectedSubmission.submittedBy || '-'}</p>
                      </div>
                      {selectedSubmission.processedAt && (
                        <div>
                          <label className="text-sm font-medium">Processed At</label>
                          <p className="text-sm">{new Date(selectedSubmission.processedAt).toLocaleString()}</p>
                        </div>
                      )}
                      {selectedSubmission.deduplicationKey && (
                        <div className="col-span-2">
                          <label className="text-sm font-medium">Deduplication Key</label>
                          <p className="text-sm font-mono text-muted-foreground truncate">
                            {selectedSubmission.deduplicationKey}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {selectedSubmission.validationErrors && (
                  <TabsContent value="errors">
                    <div className="space-y-2">
                      {selectedSubmission.validationErrors.map((err, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-3 bg-destructive/10 rounded-md">
                          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                          <div>
                            <p className="font-medium text-sm">{err.field}</p>
                            <p className="text-sm text-muted-foreground">{err.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        {/* Create/Edit Form Dialog */}
        <Dialog open={showFormDialog} onOpenChange={(open) => {
          if (!open) {
            setShowFormDialog(false);
            setEditingSubmission(null);
            setMutationError(null);
          }
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSubmission ? 'Editar Registro' : 'Novo Registro'}
                {formName && <span className="text-muted-foreground font-normal ml-2">- {formName}</span>}
              </DialogTitle>
            </DialogHeader>
            {mutationError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{mutationError}</AlertDescription>
              </Alert>
            )}
            <FormPreview
              formName=""
              formDescription=""
              fields={formFieldsForPreview}
              initialValues={editingSubmission?.data || null}
              submitLabel={editingSubmission ? 'Salvar' : 'Enviar'}
              onSubmit={handleFormSubmit}
            />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
