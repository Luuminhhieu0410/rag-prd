import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import useAuth from '../../hooks/useAuth';
import useMe from '../../hooks/api/useMe';
import { AppShell } from '@/layouts/AppShell';
import { api } from '@/helpers';
import { isProcessing } from '@/helpers/documents';
import type {
  ApiKeyRecord,
  Collection,
  CreatedApiKey,
  DocumentRecord,
} from '@/types/api';
import { ApiKeysPanel } from './components/ApiKeysPanel';
import { ChatPreviewPanel } from './components/ChatPreviewPanel';
import {
  CollectionSettingsPanel,
  type CollectionFormState,
} from './components/CollectionSettingsPanel';
import { CollectionSidebar } from './components/CollectionSidebar';
import { DocumentsPanel } from './components/DocumentsPanel';
import { StatGrid } from './components/StatGrid';
import { WorkspaceEmptyPanel } from './components/WorkspaceEmptyPanel';

const collectionKey = ['collections'];
const apiKeysKey = ['api-keys'];

export default function HomePage() {
  const queryClient = useQueryClient();
  const { signOut } = useAuth();
  const { data: me } = useMe();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collectionDraft, setCollectionDraft] = useState<
    (CollectionFormState & { collectionId: string }) | null
  >(null);
  const [apiKeyName, setApiKeyName] = useState('');
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [draggingFile, setDraggingFile] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const collectionsQuery = useQuery({
    queryKey: collectionKey,
    queryFn: () => api<Collection[]>({ url: '/api/collection' }),
  });

  const collections = useMemo(
    () => collectionsQuery.data ?? [],
    [collectionsQuery.data],
  );
  const effectiveSelectedId = selectedId ?? collections[0]?.id ?? null;
  const selectedCollection = useMemo(
    () => collections.find((item) => item.id === effectiveSelectedId) ?? null,
    [collections, effectiveSelectedId],
  );
  const collectionForm =
    selectedCollection && collectionDraft?.collectionId === selectedCollection.id
      ? collectionDraft
      : {
          collectionId: selectedCollection?.id ?? '',
          name: selectedCollection?.name ?? '',
          description: selectedCollection?.description ?? '',
        };

  const documentsKey = ['documents', effectiveSelectedId];
  const documentsQuery = useQuery({
    queryKey: documentsKey,
    queryFn: () =>
      api<DocumentRecord[]>({
        url: `/api/collection/${effectiveSelectedId}/documents`,
      }),
    enabled: !!effectiveSelectedId,
    refetchInterval: (query) => {
      const docs = query.state.data ?? [];
      return docs.some(isProcessing) ? 3000 : false;
    },
  });

  const apiKeysQuery = useQuery({
    queryKey: apiKeysKey,
    queryFn: () => api<ApiKeyRecord[]>({ url: '/api-keys' }),
  });

  const createCollection = useMutation({
    mutationFn: () =>
      api<Collection>({
        url: '/api/collection',
        method: 'POST',
        data: { name: 'Untitled collection' },
      }),
    onSuccess: (created) => {
      setSelectedId(created.id);
      queryClient.invalidateQueries({ queryKey: collectionKey });
    },
  });

  const updateCollection = useMutation({
    mutationFn: () =>
      api<Collection>({
        url: `/api/collection/${effectiveSelectedId}`,
        method: 'PATCH',
        data: {
          name: collectionForm.name,
          description: collectionForm.description,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionKey });
    },
  });

  const deleteCollection = useMutation({
    mutationFn: (id: string) =>
      api<void>({ url: `/api/collection/${id}`, method: 'DELETE' }),
    onSuccess: (_data, deletedId) => {
      setSelectedId(
        collections.find((collection) => collection.id !== deletedId)?.id ??
          null,
      );
      queryClient.invalidateQueries({ queryKey: collectionKey });
    },
  });

  const uploadDocument = useMutation({
    mutationFn: (file: File) => {
      if (!effectiveSelectedId) throw new Error('Select a collection first');
      const formData = new FormData();
      formData.append('file', file);
      return api<DocumentRecord>({
        url: `/api/collection/${effectiveSelectedId}/documents`,
        method: 'POST',
        data: formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentsKey });
      queryClient.invalidateQueries({ queryKey: collectionKey });
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
  });

  const deleteDocument = useMutation({
    mutationFn: (docId: string) =>
      api<void>({
        url: `/api/collection/${effectiveSelectedId}/documents/${docId}`,
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentsKey });
      queryClient.invalidateQueries({ queryKey: collectionKey });
    },
  });

  const createApiKey = useMutation({
    mutationFn: () =>
      api<CreatedApiKey>({
        url: '/api-keys',
        method: 'POST',
        data: {
          name: apiKeyName.trim(),
          collectionId: effectiveSelectedId,
        },
      }),
    onSuccess: (created) => {
      setNewApiKey(created.key);
      setApiKeyName('');
      queryClient.invalidateQueries({ queryKey: apiKeysKey });
    },
  });

  const revokeApiKey = useMutation({
    mutationFn: (id: string) =>
      api<void>({ url: `/api-keys/${id}`, method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeysKey });
    },
  });

  async function openDocumentUrl(docId: string, kind: 'raw' | 'text') {
    if (!effectiveSelectedId) return;
    const { url } = await api<{ url: string }>({
      url: `/api/collection/${effectiveSelectedId}/documents/${docId}/${kind}-url`,
    });
    window.open(url, '_blank', 'noreferrer');
  }

  function handleFile(file?: File) {
    if (file) uploadDocument.mutate(file);
  }

  const documents = documentsQuery.data ?? [];
  const activeApiKeys = (apiKeysQuery.data ?? []).filter((key) => !key.revokedAt);
  const stats = {
    documents: documents.length,
    ready: documents.filter((doc) => doc.status === 'ready').length,
    failed: documents.filter((doc) => doc.status === 'failed').length,
    processing: documents.filter(isProcessing).length,
    chunks: documents.reduce((sum, doc) => sum + (doc.chunkCount ?? 0), 0),
    activeApiKeys: activeApiKeys.length,
  };

  return (
    <AppShell
      email={me?.email}
      onSignOut={() => void signOut().catch(console.error)}
    >
      <CollectionSidebar
        collections={collections}
        selectedId={effectiveSelectedId}
        isLoading={collectionsQuery.isLoading}
        isError={collectionsQuery.isError}
        isCreating={createCollection.isPending}
        onCreate={() => createCollection.mutate()}
        onSelect={setSelectedId}
      />
      <section className="min-w-0 space-y-4">
        {!selectedCollection ? (
          <WorkspaceEmptyPanel
            isCreating={createCollection.isPending}
            onCreate={() => createCollection.mutate()}
          />
        ) : (
          <>
            <StatGrid stats={stats} />

            <CollectionSettingsPanel
              collection={selectedCollection}
              form={collectionForm}
              isUpdating={updateCollection.isPending}
              isDeleting={deleteCollection.isPending}
              isFetchingDocuments={documentsQuery.isFetching}
              onFormChange={(form) =>
                setCollectionDraft({
                  ...form,
                  collectionId: selectedCollection.id,
                })
              }
              onRefreshDocuments={() => void documentsQuery.refetch()}
              onUpdate={() => updateCollection.mutate()}
              onDelete={() => {
                if (confirm('Delete this collection?')) {
                  deleteCollection.mutate(selectedCollection.id);
                }
              }}
            />
            <DocumentsPanel
              documents={documents}
              isLoading={documentsQuery.isLoading}
              isError={documentsQuery.isError}
              isUploading={uploadDocument.isPending}
              isDeleting={deleteDocument.isPending}
              isDraggingFile={draggingFile}
              uploadDialogOpen={uploadDialogOpen}
              fileInputRef={fileInputRef}
              onUploadDialogOpenChange={setUploadDialogOpen}
              onDraggingFileChange={setDraggingFile}
              onFileSelected={handleFile}
              onOpenDocumentUrl={(docId, kind) =>
                void openDocumentUrl(docId, kind)
              }
              onDeleteDocument={(docId) => {
                if (confirm('Delete this document?')) {
                  deleteDocument.mutate(docId);
                }
              }}
            />
            <ChatPreviewPanel />
            <ApiKeysPanel
              activeApiKeys={activeApiKeys}
              apiKeyName={apiKeyName}
              newApiKey={newApiKey}
              isLoading={apiKeysQuery.isLoading}
              isError={apiKeysQuery.isError}
              isCreating={createApiKey.isPending}
              isRevoking={revokeApiKey.isPending}
              onApiKeyNameChange={setApiKeyName}
              onCreateApiKey={() => createApiKey.mutate()}
              onRevokeApiKey={(id) => revokeApiKey.mutate(id)}
            />
          </>
        )}
      </section>
    </AppShell>
  );
}
