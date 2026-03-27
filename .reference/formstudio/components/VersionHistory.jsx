import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  RefreshCw,
  History,
  Eye,
  GitBranch,
  Calendar
} from 'lucide-react';
import { dataEntryFormsAPI } from '@/api/data-entry-forms';
import { formatDistanceToNow, format } from 'date-fns';
import { enUS } from 'date-fns/locale';

export default function VersionHistory({ formId, currentVersion }) {
  const [selectedVersion, setSelectedVersion] = useState(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['form-versions', formId],
    queryFn: () => dataEntryFormsAPI.getVersions(formId),
    enabled: !!formId,
    staleTime: 60_000
  });

  const versions = data?.data || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History
            </CardTitle>
            <CardDescription>
              {versions.length} published version{versions.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No published versions</p>
            <p className="text-sm">Publish the form to create a version</p>
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((version, index) => (
              <div
                key={version.id}
                className={`p-4 border rounded-lg ${
                  version.version === currentVersion
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <Badge variant={index === 0 ? 'default' : 'outline'}>
                        v{version.version}
                      </Badge>
                      {version.version === currentVersion && (
                        <span className="text-xs text-primary mt-1">Current</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {version.changelog || 'No changelog'}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(version.publishedAt), "MMM d, yyyy 'at' h:mm a", { locale: enUS })}
                        {' - '}
                        {formatDistanceToNow(new Date(version.publishedAt), {
                          addSuffix: true,
                          locale: enUS
                        })}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedVersion(version)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Schema
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Version Schema Dialog */}
        <Dialog open={!!selectedVersion} onOpenChange={() => setSelectedVersion(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Schema v{selectedVersion?.version}
              </DialogTitle>
            </DialogHeader>
            {selectedVersion && (
              <ScrollArea className="h-[500px]">
                <div className="space-y-6 pr-4">
                  {/* Fields */}
                  <div>
                    <h4 className="font-medium mb-3">Fields ({selectedVersion.schema?.fields?.length || 0})</h4>
                    <div className="space-y-2">
                      {(selectedVersion.schema?.fields || []).map((field, idx) => (
                        <div key={idx} className="p-3 bg-muted rounded-md">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{field.label}</span>
                              <span className="text-sm text-muted-foreground ml-2">({field.name})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{field.type}</Badge>
                              {field.required && (
                                <Badge variant="destructive">Required</Badge>
                              )}
                            </div>
                          </div>
                          {field.description && (
                            <p className="text-sm text-muted-foreground mt-1">{field.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Target Config */}
                  {selectedVersion.schema?.targetConfig && (
                    <div>
                      <h4 className="font-medium mb-3">Target Configuration</h4>
                      <pre className="p-3 bg-muted rounded-md text-sm font-mono overflow-auto">
                        {JSON.stringify(selectedVersion.schema.targetConfig, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Write Strategy */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Write Strategy</h4>
                      <Badge variant="outline">
                        {selectedVersion.schema?.writeStrategy || 'INSERT_ONLY'}
                      </Badge>
                    </div>
                    {selectedVersion.schema?.deduplicationMode && selectedVersion.schema?.deduplicationMode !== 'NONE' && (
                      <div>
                        <h4 className="font-medium mb-2">Deduplication</h4>
                        <Badge variant="outline">
                          {selectedVersion.schema.deduplicationMode}
                        </Badge>
                        {selectedVersion.schema.deduplicationKeys?.length > 0 && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Keys: {selectedVersion.schema.deduplicationKeys.join(', ')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Changelog */}
                  {selectedVersion.changelog && (
                    <div>
                      <h4 className="font-medium mb-2">Changelog</h4>
                      <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                        {selectedVersion.changelog}
                      </p>
                    </div>
                  )}

                  {/* Raw JSON */}
                  <div>
                    <h4 className="font-medium mb-2">Complete Schema (JSON)</h4>
                    <pre className="p-3 bg-muted rounded-md text-xs font-mono overflow-auto max-h-48">
                      {JSON.stringify(selectedVersion.schema, null, 2)}
                    </pre>
                  </div>
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
