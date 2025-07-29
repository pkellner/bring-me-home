'use client';

import { useState, useCallback, useTransition, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { createPersonHistory, updatePersonHistory, deletePersonHistory, deleteAllPersonHistory } from '@/app/actions/person-history';
import { SanitizedPersonHistory } from '@/types/sanitized';
import { format } from 'date-fns';
import { Pencil, Trash2, Plus, Save, X, MessageSquare } from 'lucide-react';
import { formatDateTimeForInput } from '@/lib/date-utils';
import PersonHistoryVisibilityToggle from './PersonHistoryVisibilityToggle';
import EmailFollowersModal from './EmailFollowersModal';
import EmailStatusDrawer, { EmailStatusDrawerContent } from './EmailStatusDrawer';
import RichTextEditor from '@/components/RichTextEditor';
import { getTextPreview } from '@/lib/html-utils';

interface PersonHistoryGridProps {
  personId: string;
  initialHistory: SanitizedPersonHistory[];
  isSiteAdmin: boolean;
  isTownAdmin: boolean;
  townSlug: string;
  personSlug: string;
  personName?: string;
  townName?: string;
}

interface EditingState {
  id: string | null;
  title: string;
  description: string;
  date: string;
  visible: boolean;
  sendNotifications: boolean;
}

interface EmailStats {
  sent: number;
  opened: number;
}

export default function PersonHistoryGrid({ 
  personId, 
  initialHistory, 
  isSiteAdmin, 
  isTownAdmin: _isTownAdmin, // eslint-disable-line @typescript-eslint/no-unused-vars
  townSlug, 
  personSlug, 
  personName = '', 
  townName = '' 
}: PersonHistoryGridProps) {
  const router = useRouter();
  const [history, setHistory] = useState(initialHistory);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingState, setEditingState] = useState<EditingState>({
    id: null,
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    visible: true,
    sendNotifications: false,
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [emailModalState, setEmailModalState] = useState<{
    isOpen: boolean;
    personHistoryId: string;
    updateTitle: string;
    updateDescription: string;
    updateDate: string;
  }>({ isOpen: false, personHistoryId: '', updateTitle: '', updateDescription: '', updateDate: '' });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [emailStats, setEmailStats] = useState<Record<string, EmailStats>>({});

  // Sort history by date descending
  const sortedHistory = [...history].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Track newly added items for animation
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());

  // Fetch email stats for all history items
  useEffect(() => {
    const fetchAllEmailStats = async () => {
      const stats: Record<string, EmailStats> = {};
      for (const item of history) {
        try {
          const response = await fetch(`/api/admin/person-history/${item.id}/email-status`);
          if (response.ok) {
            const data = await response.json();
            stats[item.id] = {
              sent: data.stats.sent || 0,
              opened: data.stats.opened || 0,
            };
          }
        } catch (error) {
          console.error(`Failed to fetch email stats for ${item.id}:`, error);
        }
      }
      setEmailStats(stats);
    };

    fetchAllEmailStats();
  }, [history]);

  const toggleRowExpansion = useCallback((historyId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(historyId)) {
        newSet.delete(historyId);
      } else {
        newSet.add(historyId);
      }
      return newSet;
    });
  }, []);

  const handleEdit = useCallback((record: SanitizedPersonHistory) => {
    setEditingState({
      id: record.id,
      title: record.title,
      description: record.description,
      date: formatDateTimeForInput(record.date),
      visible: record.visible,
      sendNotifications: record.sendNotifications,
    });
    setError(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingState({
      id: null,
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      visible: true,
      sendNotifications: false,
    });
    setShowAddForm(false);
    setError(null);
  }, []);

  const handleAddClick = useCallback(() => {
    setShowAddForm(true);
    setEditingState({
      id: null,
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      visible: true,
      sendNotifications: false,
    });
  }, []);

  // Remove animation class after a delay
  useEffect(() => {
    if (newItemIds.size > 0) {
      const timer = setTimeout(() => {
        setNewItemIds(new Set());
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [newItemIds]);

  const handleSave = useCallback(async () => {
    const dateValue = editingState.date.includes('T') 
      ? new Date(editingState.date)
      : new Date(editingState.date + 'T12:00:00');
  
    if (isNaN(dateValue.getTime())) {
      setError('Invalid date format');
      return;
    }

    startTransition(async () => {
      try {
        if (editingState.id) {
          // Update existing
          const formData = new FormData();
          formData.set('title', editingState.title.trim());
          formData.set('description', editingState.description.trim());
          formData.set('date', dateValue.toISOString());
          formData.set('visible', editingState.visible.toString());
          formData.set('sendNotifications', editingState.sendNotifications.toString());
          
          const result = await updatePersonHistory(editingState.id, formData);
          
          if (result.error || !result.data) {
            setError(result.error || 'Failed to update history note');
          } else {
            setHistory(prev => prev.map(item => 
              item.id === editingState.id 
                ? {
                    ...item,
                    title: result.data.title,
                    description: result.data.description,
                    date: result.data.date.toString(),
                    visible: result.data.visible,
                    sendNotifications: result.data.sendNotifications,
                  }
                : item
            ));
          }
        } else {
          // Create new
          const formData = new FormData();
          formData.set('title', editingState.title.trim());
          formData.set('description', editingState.description.trim());
          formData.set('date', dateValue.toISOString());
          formData.set('visible', editingState.visible.toString());
          formData.set('sendNotifications', editingState.sendNotifications.toString());
          
          const result = await createPersonHistory(personId, formData);

          if (result.error || !result.data) {
            setError(result.error || 'Failed to create history note');
          } else {
            const newItem: SanitizedPersonHistory = {
              id: result.data.id,
              title: result.data.title,
              description: result.data.description,
              date: result.data.date.toString(),
              visible: result.data.visible,
              sendNotifications: result.data.sendNotifications,
              createdByUsername: result.data.createdByUsername,
              createdByUserId: result.data.createdByUserId,
              createdAt: result.data.createdAt.toString(),
              updatedAt: result.data.updatedAt.toString(),
            };
            setHistory(prev => [newItem, ...prev]);
            setNewItemIds(prev => new Set(prev).add(newItem.id));
          }
        }
        handleCancelEdit();
        router.refresh();
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
        setHistory(prev => prev.filter(item => item.id !== id));
        router.refresh();
      }
    });
  }, [router]);

  const handleDeleteAll = useCallback(async () => {
    const noteCount = history.length;
    if (!confirm(`Are you sure you want to delete all ${noteCount} history notes? This action cannot be undone.`)) {
      return;
    }

    if (!confirm(`This will permanently delete ALL history notes for this person. Are you absolutely sure?`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteAllPersonHistory(personId);
      if (result.error) {
        setError(result.error);
      } else {
        setHistory([]);
        router.refresh();
      }
    });
  }, [history.length, personId, router]);

  const truncateText = (text: string, maxLength = 80) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="mt-6">
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mb-6">
        {!showAddForm && (
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
        )}
      </div>

      {/* Add Form - Now outside the table for better layout */}
      {showAddForm && (
        <div className="mb-6 bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Update</h3>
          
          <div className="space-y-4">
            {/* Visibility checkbox */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="add-visible"
                checked={editingState.visible}
                onChange={(e) => setEditingState({ ...editingState, visible: e.target.checked })}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="add-visible" className="ml-2 text-sm text-gray-700">
                Visible to Public
              </label>
            </div>

            {/* Title field */}
            <div>
              <label htmlFor="add-title" className="block text-sm font-medium text-gray-700 mb-1">
                Update Title
              </label>
              <input
                type="text"
                id="add-title"
                value={editingState.title}
                onChange={(e) => setEditingState({ ...editingState, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter a brief title for this update..."
                maxLength={255}
              />
              <div className="text-xs text-gray-500 mt-1">
                {editingState.title.length}/255 characters
              </div>
            </div>

            {/* Date field */}
            <div>
              <label htmlFor="add-date" className="block text-sm font-medium text-gray-700 mb-1">
                Update Date
              </label>
              <input
                type="date"
                id="add-date"
                value={editingState.date}
                onChange={(e) => setEditingState({ ...editingState, date: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Description field */}
            <div>
              <label htmlFor="add-description" className="block text-sm font-medium text-gray-700 mb-2">
                Update Description
              </label>
              <RichTextEditor
                value={editingState.description}
                onChange={(value) => {
                  const textContent = value.replace(/<[^>]*>/g, '');
                  if (textContent.length <= 2048) {
                    setEditingState({ ...editingState, description: value });
                  }
                }}
                placeholder="Enter update details here..."
                height={300}
              />
              <div className="mt-3 space-y-2">
                <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      editingState.description.replace(/<[^>]*>/g, '').length / 2048 > 0.9 
                        ? 'bg-red-500' 
                        : editingState.description.replace(/<[^>]*>/g, '').length / 2048 > 0.7 
                          ? 'bg-yellow-500' 
                          : 'bg-green-500'
                    }`}
                    style={{ width: `${(editingState.description.replace(/<[^>]*>/g, '').length / 2048) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{editingState.description.replace(/<[^>]*>/g, '').length}/2048 characters (text only)</span>
                  <span className="text-xs text-gray-500">HTML formatting preserved</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                disabled={!editingState.title.trim() || !editingState.description.trim() || isPending}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="h-4 w-4 mr-2" />
                {isPending ? 'Saving...' : 'Save Update'}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={isPending}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email Actions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Visible
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedHistory.map((record) => (
              <Fragment key={record.id}>
                <tr className={`hover:bg-gray-50 ${newItemIds.has(record.id) ? 'animate-pulse bg-green-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-2">
                      <button
                        onClick={() => setEmailModalState({
                          isOpen: true,
                          personHistoryId: record.id,
                          updateTitle: record.title,
                          updateDescription: record.description,
                          updateDate: record.date,
                        })}
                        className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors"
                        title="Email followers about this update"
                      >
                        Email Followers
                      </button>
                      <EmailStatusDrawer
                        sentCount={emailStats[record.id]?.sent || 0}
                        openedCount={emailStats[record.id]?.opened || 0}
                        expanded={expandedRows.has(record.id)}
                        onToggle={() => toggleRowExpansion(record.id)}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="leading-tight">
                      <div>{format(new Date(record.date), 'MMM dd, yyyy')}</div>
                      <div className="text-xs text-gray-500">{format(new Date(record.date), 'h:mm a')}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-md">
                      <div className="font-medium">{truncateText(record.title, 100)}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {getTextPreview(record.description, 80)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.createdByUsername}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <PersonHistoryVisibilityToggle
                      historyId={record.id}
                      initialVisible={record.visible}
                      onUpdate={(id, visible) => {
                        setHistory(prev => prev.map(h => h.id === id ? { ...h, visible } : h));
                      }}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(record)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <a
                        href={`/admin/comments/${townSlug}/${personSlug}#${record.id}`}
                        className="text-blue-600 hover:text-blue-900"
                        title="View comments for this update"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </a>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                {/* Edit form as separate row */}
                {editingState.id === record.id && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 bg-gray-50">
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-gray-900">Edit Update</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Left column */}
                          <div className="space-y-4">
                            {/* Visibility checkbox */}
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id={`edit-visible-${record.id}`}
                                checked={editingState.visible}
                                onChange={(e) => setEditingState({ ...editingState, visible: e.target.checked })}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                              <label htmlFor={`edit-visible-${record.id}`} className="ml-2 text-sm text-gray-700">
                                Visible to Public
                              </label>
                            </div>

                            {/* Date field */}
                            <div>
                              <label htmlFor={`edit-date-${record.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                                Update Date
                              </label>
                              <input
                                type="datetime-local"
                                id={`edit-date-${record.id}`}
                                value={editingState.date}
                                onChange={(e) => setEditingState({ ...editingState, date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>

                            {/* Title field */}
                            <div>
                              <label htmlFor={`edit-title-${record.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                                Update Title
                              </label>
                              <input
                                type="text"
                                id={`edit-title-${record.id}`}
                                value={editingState.title}
                                onChange={(e) => setEditingState({ ...editingState, title: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                                placeholder="Update title..."
                                maxLength={255}
                              />
                              <div className="text-xs text-gray-500 mt-1">
                                {editingState.title.length}/255 characters
                              </div>
                            </div>
                          </div>

                          {/* Right column - Description */}
                          <div>
                            <label htmlFor={`edit-description-${record.id}`} className="block text-sm font-medium text-gray-700 mb-2">
                              Update Description
                            </label>
                            <RichTextEditor
                              value={editingState.description}
                              onChange={(value) => {
                                const textContent = value.replace(/<[^>]*>/g, '');
                                if (textContent.length <= 2048) {
                                  setEditingState({ ...editingState, description: value });
                                }
                              }}
                              placeholder="Enter update description..."
                              height={200}
                            />
                            <div className="text-xs text-gray-500 mt-2">
                              {editingState.description.replace(/<[^>]*>/g, '').length}/2048 characters
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-3 pt-2 border-t border-gray-200">
                          <button
                            onClick={handleSave}
                            disabled={!editingState.title.trim() || !editingState.description.trim() || isPending}
                            className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {isPending ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={isPending}
                            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white font-medium rounded-md hover:bg-gray-700 disabled:opacity-50"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                <EmailStatusDrawerContent
                  personHistoryId={record.id}
                  expanded={expandedRows.has(record.id)}
                />
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {emailModalState.isOpen && (
        <EmailFollowersModal
          isOpen={emailModalState.isOpen}
          onClose={() => setEmailModalState({ ...emailModalState, isOpen: false })}
          personHistoryId={emailModalState.personHistoryId}
          personName={personName}
          updateTitle={emailModalState.updateTitle}
          updateDescription={emailModalState.updateDescription}
          updateDate={emailModalState.updateDate}
          townName={townName}
          personSlug={personSlug}
          townSlug={townSlug}
        />
      )}
    </div>
  );
}