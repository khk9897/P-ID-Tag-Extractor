import React, { useState, useRef, useEffect } from 'react';
import { Comment, CommentPriority } from '../types';

interface CommentModalProps {
  isOpen: boolean;
  targetId: string;
  targetName: string;
  targetType: 'tag' | 'description' | 'equipmentSpec' | 'relationship' | 'loop';
  comments: Comment[];
  onClose: () => void;
  onCreateComment: (content: string, priority: CommentPriority) => void;
  onUpdateComment: (commentId: string, updates: Partial<Pick<Comment, 'content' | 'priority' | 'isResolved'>>) => void;
  onDeleteComment: (commentId: string) => void;
}

const PRIORITY_COLORS = {
  high: 'text-red-400 bg-red-500/20 border-red-500/30',
  medium: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
  low: 'text-slate-400 bg-slate-500/20 border-slate-500/30'
} as const;

const PRIORITY_LABELS = {
  high: '🔴 HIGH',
  medium: '🟡 MED',
  low: '⚪ LOW'
} as const;

export const CommentModal: React.FC<CommentModalProps> = ({
  isOpen,
  targetId,
  targetName,
  targetType,
  comments,
  onClose,
  onCreateComment,
  onUpdateComment,
  onDeleteComment
}) => {
  const [newComment, setNewComment] = useState('');
  const [newPriority, setNewPriority] = useState<CommentPriority>('medium');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editPriority, setEditPriority] = useState<CommentPriority>('medium');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmitNew = () => {
    if (newComment.trim()) {
      onCreateComment(newComment.trim(), newPriority);
      setNewComment('');
      setNewPriority('medium');
    }
  };

  const handleStartEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
    setEditPriority(comment.priority);
  };

  const handleSaveEdit = () => {
    if (editingId && editContent.trim()) {
      onUpdateComment(editingId, {
        content: editContent.trim(),
        priority: editPriority
      });
      setEditingId(null);
      setEditContent('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const sortedComments = [...comments].sort((a, b) => {
    // Sort by resolved status (unresolved first), then priority (high first), then timestamp (newest first)
    if (a.isResolved !== b.isResolved) return a.isResolved ? 1 : -1;
    
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    
    return b.timestamp - a.timestamp;
  });

  const unresolvedCount = comments.filter(c => !c.isResolved).length;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-fade-in-up">
      <div
        ref={modalRef}
        className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col text-white"
      >
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-1">Comments</h3>
              <p className="text-slate-400">
                {targetType}: <span className="text-sky-400">{targetName}</span>
              </p>
              {comments.length > 0 && (
                <p className="text-sm text-slate-500 mt-1">
                  {comments.length} total • {unresolvedCount} unresolved
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Comments List */}
        <div className="flex-1 p-6 overflow-y-auto">
          {sortedComments.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No comments yet</p>
          ) : (
            <div className="space-y-4">
              {sortedComments.map((comment) => (
                <div
                  key={comment.id}
                  className={`p-4 rounded-lg border ${
                    comment.isResolved 
                      ? 'bg-slate-700/30 border-slate-600/50' 
                      : 'bg-slate-700/50 border-slate-600'
                  }`}
                >
                  {editingId === comment.id ? (
                    // Edit Mode
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={editPriority}
                          onChange={(e) => setEditPriority(e.target.value as CommentPriority)}
                          className="px-3 py-1 bg-slate-800 border border-slate-600 rounded text-sm"
                        >
                          <option value="high">🔴 HIGH</option>
                          <option value="medium">🟡 MEDIUM</option>
                          <option value="low">⚪ LOW</option>
                        </select>
                      </div>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 resize-none"
                        rows={3}
                        placeholder="Edit comment..."
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 rounded-lg text-sm font-medium transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-4 py-2 bg-slate-600 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold border ${PRIORITY_COLORS[comment.priority]}`}>
                            {PRIORITY_LABELS[comment.priority]}
                          </span>
                          <span className="text-slate-400 text-sm">
                            {comment.author} • {new Date(comment.timestamp).toLocaleString()}
                          </span>
                          {comment.isResolved && (
                            <span className="text-green-400 text-sm">✅ Resolved</span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleStartEdit(comment)}
                            className="p-1 text-slate-400 hover:text-sky-400 transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => onUpdateComment(comment.id, { isResolved: !comment.isResolved })}
                            className={`p-1 transition-colors ${
                              comment.isResolved 
                                ? 'text-green-400 hover:text-green-300' 
                                : 'text-slate-400 hover:text-green-400'
                            }`}
                            title={comment.isResolved ? "Mark as unresolved" : "Mark as resolved"}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => onDeleteComment(comment.id)}
                            className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p className={`${comment.isResolved ? 'text-slate-400' : 'text-white'} whitespace-pre-wrap`}>
                        {comment.content}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Comment Section */}
        <div className="flex-shrink-0 p-6 border-t border-slate-700">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as CommentPriority)}
                className="px-3 py-2 bg-slate-800 border border-slate-600 rounded text-sm"
              >
                <option value="high">🔴 HIGH</option>
                <option value="medium">🟡 MEDIUM</option>
                <option value="low">⚪ LOW</option>
              </select>
            </div>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 resize-none"
              rows={3}
              placeholder="Add a comment..."
            />
            <div className="flex gap-2">
              <button
                onClick={handleSubmitNew}
                disabled={!newComment.trim()}
                className="px-6 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
              >
                Add Comment
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-slate-600 hover:bg-slate-700 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};