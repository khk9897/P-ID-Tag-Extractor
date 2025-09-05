import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Comment, Tag, Description } from '../../types';
import { useSidePanelStore } from '../../stores/sidePanelStore';
import { filterComments, sortComments } from '../../utils/filterUtils';
import { IconButton } from '../common/IconButton';

interface CommentsPanelProps {
  comments: Comment[];
  tags: Tag[];
  descriptions: Description[];
  onUpdateComment: (id: string, updates: Partial<Comment>) => void;
  onDeleteComment: (id: string) => void;
  onCreateComment: (comment: Partial<Comment>) => void;
}

const PRIORITY_COLORS = {
  high: 'text-red-400',
  medium: 'text-yellow-400',
  low: 'text-blue-400'
};

const CommentListItem = React.memo(({
  comment,
  targetName,
  onToggleResolved,
  onEdit,
  onDelete
}: {
  comment: Comment;
  targetName: string;
  onToggleResolved: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  return (
    <li className="group px-2 py-2 border-b border-slate-700 hover:bg-slate-700/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold ${PRIORITY_COLORS[comment.priority]}`}>
              {comment.priority}
            </span>
            <span className="text-xs text-slate-500">
              {new Date(comment.timestamp).toLocaleString()}
            </span>
            {comment.isResolved && (
              <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
                Resolved
              </span>
            )}
          </div>
          
          <p className="text-sm text-slate-300 mb-1">{comment.content}</p>
          
          <div className="text-xs text-slate-500">
            On: <span className="text-slate-400">{targetName}</span>
          </div>
          
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleResolved}
            className={`p-1 rounded transition-colors ${
              comment.isResolved 
                ? 'text-slate-500 hover:text-yellow-400 hover:bg-yellow-500/20' 
                : 'text-green-400 hover:text-green-300 hover:bg-green-500/20'
            } opacity-0 group-hover:opacity-100`}
            title={comment.isResolved ? 'Reopen' : 'Resolve'}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              {comment.isResolved ? (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9.5H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              )}
            </svg>
          </button>
          <IconButton
            icon="edit"
            onClick={onEdit}
            className="opacity-0 group-hover:opacity-100"
          />
          <IconButton
            icon="trash"
            onClick={onDelete}
            title="Delete comment"
            className="opacity-0 group-hover:opacity-100"
          />
        </div>
      </div>
    </li>
  );
});

CommentListItem.displayName = 'CommentListItem';

export const CommentsPanel: React.FC<CommentsPanelProps> = ({
  comments,
  tags,
  descriptions,
  onUpdateComment,
  onDeleteComment,
  onCreateComment
}) => {
  const { 
    commentsTabFilter, 
    openCommentModal,
    showCurrentPageOnly,
    currentPage 
  } = useSidePanelStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(600);

  // Calculate list height dynamically
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const containerHeight = containerRef.current.offsetHeight;
        setListHeight(containerHeight);
      }
    };

    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  // Create lookup maps
  const targetNameMap = useMemo(() => {
    const map = new Map<string, string>();
    tags.forEach(tag => map.set(tag.id, tag.text));
    descriptions.forEach(desc => 
      map.set(desc.id, `${desc.metadata?.type || 'Description'} ${desc.metadata?.number || ''}: ${desc.text.substring(0, 50)}...`)
    );
    return map;
  }, [tags, descriptions]);
  
  // Filter and sort comments
  const filteredComments = useMemo(() => {
    let filtered = filterComments(comments, commentsTabFilter);
    
    // Apply current page filter
    if (showCurrentPageOnly && currentPage !== undefined) {
      filtered = filtered.filter(comment => {
        // Find the target entity (tag or description) for this comment
        const targetTag = tags.find(tag => tag.id === comment.targetId);
        const targetDescription = descriptions.find(desc => desc.id === comment.targetId);
        
        // Check if the target entity is on the current page
        if (targetTag) {
          return targetTag.page === currentPage;
        } else if (targetDescription) {
          return targetDescription.page === currentPage;
        }
        
        // If no target found, don't show the comment
        return false;
      });
    }
    
    return sortComments(filtered);
  }, [comments, commentsTabFilter, showCurrentPageOnly, currentPage, tags, descriptions]);
  
  const handleToggleResolved = useCallback((comment: Comment) => {
    onUpdateComment(comment.id, { isResolved: !comment.isResolved });
  }, [onUpdateComment]);
  
  const handleEditComment = useCallback((comment: Comment) => {
    const newText = prompt('Edit comment:', comment.content);
    if (newText && newText !== comment.content) {
      onUpdateComment(comment.id, { 
        content: newText
      });
    }
  }, [onUpdateComment]);
  
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const comment = filteredComments[index];
    const targetName = targetNameMap.get(comment.targetId) || 'Unknown';
    
    return (
      <div style={style}>
        <CommentListItem
          comment={comment}
          targetName={targetName}
          onToggleResolved={() => handleToggleResolved(comment)}
          onEdit={() => handleEditComment(comment)}
          onDelete={() => onDeleteComment(comment.id)}
        />
      </div>
    );
  }, [filteredComments, targetNameMap, handleToggleResolved, handleEditComment, onDeleteComment]);
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="mb-2 px-3 flex-shrink-0">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">
            {filteredComments.length} comments
            {commentsTabFilter !== 'all' && (
              <span className="ml-2 text-xs text-slate-500">
                ({commentsTabFilter})
              </span>
            )}
          </span>
        </div>
      </div>
      
      <div ref={containerRef} className="flex-1 min-h-0">
        {filteredComments.length > 0 ? (
          <List
            height={listHeight}
            itemCount={filteredComments.length}
            itemSize={100}
            width="100%"
            className="scrollbar-thin scrollbar-thumb-slate-600"
          >
            {Row}
          </List>
        ) : (
          <div className="px-3 py-8 text-center text-slate-500">
            {commentsTabFilter === 'all' 
              ? 'No comments yet'
              : `No ${commentsTabFilter} comments`}
          </div>
        )}
      </div>
    </div>
  );
};