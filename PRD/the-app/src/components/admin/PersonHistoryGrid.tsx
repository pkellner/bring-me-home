'use client';

import { useState, useCallback, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminDataGrid, { GridColumn, GridAction } from './AdminDataGrid';
import { createPersonHistory, updatePersonHistory, deletePersonHistory, deleteAllPersonHistory } from '@/app/actions/person-history';
import { SanitizedPersonHistory } from '@/types/sanitized';
import { format } from 'date-fns';
import { Pencil, Trash2, Plus, Save, X } from 'lucide-react';
import { formatDateForInput, formatDateTimeForInput } from '@/lib/date-utils';
import PersonHistoryVisibilityToggle from './PersonHistoryVisibilityToggle';

interface PersonHistoryGridProps {
  personId: string;
  initialHistory: SanitizedPersonHistory[];
  isSiteAdmin: boolean;
  isTownAdmin: boolean;
  townSlug: string;
  personSlug: string;
}

interface EditingState {
  id: string | null;
  description: string;
  date: string;
  visible: boolean;
  sendNotifications: boolean;
}

export default function PersonHistoryGrid({ personId, initialHistory, isSiteAdmin, isTownAdmin, townSlug, personSlug }: PersonHistoryGridProps) {
  const router = useRouter();
  const [history, setHistory] = useState(initialHistory);
  const [isAdding, setIsAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingState, setEditingState] = useState<EditingState>({
    id: null,
    description: '',
    date: new Date().toISOString().split('T')[0],
    visible: true,
    sendNotifications: false,
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Sort history by date descending
  const sortedHistory = [...history].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Track newly added items for animation
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());

  // Clear animation class after animation completes
  useEffect(() => {
    if (newItemIds.size > 0) {
      const timer = setTimeout(() => {
        setNewItemIds(new Set());
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [newItemIds]);

  const handleEdit = useCallback((record: SanitizedPersonHistory) => {
    // Use datetime format for town/system admins, date only for person admin
    const canEditDateTime = isSiteAdmin || isTownAdmin;
    const dateStr = canEditDateTime 
      ? formatDateTimeForInput(record.date)
      : formatDateForInput(record.date);
    
    setEditingState({
      id: record.id,
      description: record.description,
      date: dateStr,
      visible: record.visible,
      sendNotifications: record.sendNotifications,
    });
  }, [isSiteAdmin, isTownAdmin]);

  const handleCancelEdit = useCallback(() => {
    setEditingState({
      id: null,
      description: '',
      date: new Date().toISOString().split('T')[0],
      visible: true,
      sendNotifications: false,
    });
    setShowAddForm(false);
    setTimeout(() => setIsAdding(false), 300); // Wait for animation
    setError(null);
  }, []);

  const handleAddClick = useCallback(() => {
    setIsAdding(true);
    // Use setTimeout to trigger animation after render
    setTimeout(() => setShowAddForm(true), 10);
  }, []);

  const handleSave = useCallback(async () => {
    const formData = new FormData();
    formData.append('description', editingState.description);
    formData.append('date', editingState.date);
    formData.append('visible', editingState.visible.toString());

    startTransition(async () => {
      try {
        let result;
        if (editingState.id) {
          result = await updatePersonHistory(editingState.id, formData);
        } else {
          result = await createPersonHistory(personId, formData);
        }
        

        if (result.errors) {
          // Handle validation errors
          const errorMessages = Object.values(result.errors).flat().join(', ');
          setError(errorMessages);
        } else if (result.error) {
          setError(result.error);
        } else if (result.success && result.data) {
          // Update local state immediately
          if (editingState.id) {
            // Update existing item
            setHistory(prev => prev.map(item => 
              item.id === editingState.id 
                ? {
                    ...item,
                    description: result.data.description,
                    date: result.data.date.toString(),
                    visible: result.data.visible,
                    sendNotifications: result.data.sendNotifications,
                    updatedAt: result.data.updatedAt.toString(),
                  }
                : item
            ));
          } else {
            // Add new item
            const newItem: SanitizedPersonHistory = {
              id: result.data.id,
              description: result.data.description,
              date: result.data.date.toString(),
              visible: result.data.visible,
              sendNotifications: result.data.sendNotifications,
              createdByUsername: result.data.createdByUsername,
              createdAt: result.data.createdAt.toString(),
              updatedAt: result.data.updatedAt.toString(),
            };
            setHistory(prev => [newItem, ...prev]);
            // Add to animation set
            setNewItemIds(prev => new Set(prev).add(newItem.id));
          }
          handleCancelEdit();
          // Refresh in background to sync with server
          router.refresh();
        } else {
          setError('Failed to save history note');
        }
      } catch {
        setError('An unexpected error occurred');
      }
    });
  }, [editingState, personId, router, handleCancelEdit]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this history note?')) {
      return;
    }

    startTransition(async () => {
      const result = await deletePersonHistory(id);
      if (result.error) {
        setError(result.error);
      } else {
        // Update local state immediately
        setHistory(prev => prev.filter(item => item.id !== id));
        // Refresh in background to sync with server
        router.refresh();
      }
    });
  }, [router]);

  const handleDeleteAll = useCallback(async () => {
    const noteCount = history.length;
    if (!confirm(`Are you sure you want to delete all ${noteCount} history notes? This action cannot be undone.`)) {
      return;
    }

    // Double confirmation for destructive action
    if (!confirm(`This will permanently delete ALL history notes for this person. Are you absolutely sure?`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteAllPersonHistory(personId);
      if (result.error) {
        setError(result.error);
      } else {
        // Clear local state immediately
        setHistory([]);
        // Refresh in background to sync with server
        router.refresh();
      }
    });
  }, [history.length, personId, router]);

  const columns: GridColumn<SanitizedPersonHistory>[] = [
    {
      key: 'email',
      label: 'Actions',
      width: '140px',
      render: (_, record) => {
        if (!isSiteAdmin) return null;
        return (
          <a
            href={`/admin/email/send/${record.id}`}
            className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors"
            title="Email followers about this update"
          >
            Email Followers
          </a>
        );
      },
    },
    {
      key: 'date',
      label: 'Date',
      width: '150px',
      render: (_, record) => {
        if (editingState.id === record.id) {
          // Only site admin and town admin can edit date/time
          const canEditDateTime = isSiteAdmin || isTownAdmin;
          if (canEditDateTime) {
            return (
              <input
                type="datetime-local"
                value={editingState.date}
                onChange={(e) => setEditingState({ ...editingState, date: e.target.value })}
                className="w-full px-2 py-1 border rounded"
              />
            );
          } else {
            // Person admin can't edit date/time
            return <span className="text-gray-600">{format(new Date(record.date), 'MMM dd, yyyy HH:mm')}</span>;
          }
        }
        return format(new Date(record.date), 'MMM dd, yyyy HH:mm');
      },
    },
    {
      key: 'description',
      label: 'Description',
      render: (_, record) => {
        if (editingState.id === record.id) {
          return (
            <textarea
              value={editingState.description}
              onChange={(e) => setEditingState({ ...editingState, description: e.target.value })}
              className="w-full px-2 py-1 border rounded min-h-[60px] resize-y"
              maxLength={2048}
            />
          );
        }
        return (
          <div className="flex items-start justify-between gap-4">
            <div className="whitespace-pre-wrap flex-1">{record.description}</div>
            <div className="flex gap-3 flex-shrink-0">
              <a
                href={`/admin/comments/${townSlug}/${personSlug}#${record.id}`}
                className="text-sm text-blue-600 hover:text-blue-800 whitespace-nowrap"
                title="View comments for this update"
              >
                View Comments
              </a>
            </div>
          </div>
        );
      },
    },
    {
      key: 'createdByUsername',
      label: 'Created By',
      width: '150px',
    },
    {
      key: 'createdAt',
      label: 'Created',
      width: '150px',
      render: (_, record) => format(new Date(record.createdAt), 'MMM dd, yyyy HH:mm'),
    },
    {
      key: 'visible',
      label: 'Visible to Public',
      width: '140px',
      render: (_, record) => {
        if (editingState.id === record.id) {
          return (
            <input
              type="checkbox"
              checked={editingState.visible}
              onChange={(e) => setEditingState({ ...editingState, visible: e.target.checked })}
              className="h-4 w-4"
            />
          );
        }
        return (
          <PersonHistoryVisibilityToggle
            historyId={record.id}
            initialVisible={record.visible}
            onUpdate={(id, visible) => {
              setHistory(prev => prev.map(h => h.id === id ? { ...h, visible } : h));
            }}
          />
        );
      },
    },
    {
      key: 'updatedAt',
      label: 'Updated',
      width: '150px',
      render: (_, record) => format(new Date(record.updatedAt), 'MMM dd, yyyy HH:mm'),
    },
  ];

  const actions: GridAction<SanitizedPersonHistory>[] = [
    {
      type: 'custom',
      label: (record: SanitizedPersonHistory) => editingState.id === record.id ? 'Save' : 'Edit',
      icon: (record: SanitizedPersonHistory) => editingState.id === record.id ? Save : Pencil,
      onClick: (record: SanitizedPersonHistory) => {
        if (editingState.id === record.id) {
          handleSave();
        } else {
          handleEdit(record);
        }
      },
    },
    {
      type: 'custom',
      label: (record: SanitizedPersonHistory) => editingState.id === record.id ? 'Cancel' : 'Delete',
      icon: (record: SanitizedPersonHistory) => editingState.id === record.id ? X : Trash2,
      onClick: (record: SanitizedPersonHistory) => {
        if (editingState.id === record.id) {
          handleCancelEdit();
        } else {
          handleDelete(record.id);
        }
      },
      className: (record: SanitizedPersonHistory) => editingState.id === record.id ? 'text-gray-600' : 'text-red-600',
    },
  ];

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        {!isAdding ? (
          <div className="flex items-center gap-4">
            <button
              onClick={handleAddClick}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Update on Person
            </button>
            {isSiteAdmin && history.length > 0 && (
              <button
                onClick={handleDeleteAll}
                disabled={isPending}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Delete all history notes (Site Admin only)"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All ({history.length})
              </button>
            )}
          </div>
        ) : (
          <div 
            className={`bg-gray-50 p-4 rounded border transition-all duration-300 ease-in-out ${
              showAddForm ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              maxHeight: showAddForm ? '500px' : '0',
              overflow: showAddForm ? 'visible' : 'hidden'
            }}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingState.visible}
                    onChange={(e) => setEditingState({ ...editingState, visible: e.target.checked })}
                    className="h-4 w-4 mr-2"
                  />
                  <span className="text-sm text-black">Visible to Public</span>
                </label>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (max 2048 characters)
              </label>
              <textarea
                value={editingState.description}
                onChange={(e) => setEditingState({ ...editingState, description: e.target.value })}
                className="w-full px-3 py-2 border rounded min-h-[100px] resize-y"
                maxLength={2048}
                placeholder="Enter history note..."
              />
              <div className="text-sm text-gray-500 mt-1">
                {editingState.description.length}/2048 characters
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!editingState.description.trim() || isPending}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" />
                {isPending ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={isPending}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="transition-opacity duration-300">
        <AdminDataGrid
          data={sortedHistory}
          columns={columns}
          actions={actions}
          title="Person Updates History"
          showCreate={false}
        />
      </div>
    </div>
  );
}