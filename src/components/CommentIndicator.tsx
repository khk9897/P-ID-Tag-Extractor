import React from 'react';
import { Comment } from '../types';

interface CommentIndicatorProps {
  comments: Comment[];
  onClick?: () => void;
  size?: 'sm' | 'md';
  className?: string;
}

export const CommentIndicator: React.FC<CommentIndicatorProps> = ({
  comments,
  onClick,
  size = 'sm',
  className = ''
}) => {
  const unresolvedComments = comments.filter(c => !c.isResolved);
  const priorityCounts = {
    high: comments.filter(c => c.priority === 'high' && !c.isResolved).length,
    medium: comments.filter(c => c.priority === 'medium' && !c.isResolved).length,
    low: comments.filter(c => c.priority === 'low' && !c.isResolved).length
  };

  const hasUnresolved = unresolvedComments.length > 0;
  const totalCount = comments.length;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1'
  };

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <button
        onClick={onClick}
        className={`
          inline-flex items-center gap-1 rounded-md font-medium transition-colors
          ${sizeClasses[size]}
          ${totalCount === 0 
            ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30 hover:bg-slate-500/30'
            : hasUnresolved 
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30' 
              : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
          }
        `}
        title={totalCount === 0 
          ? 'Click to add comment' 
          : `${totalCount} comment(s) - ${unresolvedComments.length} unresolved`
        }
      >
        💬
        {totalCount === 0 && <span className="text-xs">+</span>}
        <span>{totalCount}</span>
        {hasUnresolved && (
          <span className="text-amber-300">
            ({unresolvedComments.length})
          </span>
        )}
      </button>

      {hasUnresolved && (priorityCounts.high > 0 || priorityCounts.medium > 0) && (
        <div className="inline-flex items-center gap-0.5">
          {priorityCounts.high > 0 && (
            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs font-medium">
              🔴{priorityCounts.high}
            </span>
          )}
          {priorityCounts.medium > 0 && (
            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded text-xs font-medium">
              🟡{priorityCounts.medium}
            </span>
          )}
        </div>
      )}
    </div>
  );
};