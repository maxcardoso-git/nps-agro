'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { PermissionGate } from '@/components/layout/permission-gate';
import { QuestionnairesList, FormEditor } from '@/components/form-studio';
import { apiClient } from '@/lib/api/client';
import { useRequiredSession } from '@/hooks/use-required-session';
import type { Questionnaire } from '@/lib/types';

export default function QuestionnairesPage() {
  const { session } = useRequiredSession();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ['questionnaire', selectedId],
    queryFn: () => apiClient.questionnaires.getById(session!, selectedId!),
    enabled: Boolean(session && selectedId),
  });

  if (!session) return null;

  // Editor view
  if (selectedId && detailQuery.data) {
    return (
      <PermissionGate permission="questionnaire.read">
        <FormEditor
          questionnaire={detailQuery.data}
          session={session}
          onBack={() => setSelectedId(null)}
        />
      </PermissionGate>
    );
  }

  // Loading editor data
  if (selectedId && detailQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-slate-400">Loading...</p>
      </div>
    );
  }

  // List view
  return (
    <PermissionGate permission="questionnaire.read">
      <QuestionnairesList
        session={session}
        onSelect={(q: Questionnaire) => setSelectedId(q.id)}
      />
    </PermissionGate>
  );
}
