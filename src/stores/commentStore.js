// CommentStore - 댓글 상태 관리
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

const useCommentStore = create(
  immer((set, get) => ({
    // State
    comments: [],
    
    // Computed values (getters)
    get commentsByTarget() {
      const comments = get().comments;
      const byTarget = {};
      comments.forEach(comment => {
        if (!byTarget[comment.targetId]) byTarget[comment.targetId] = [];
        byTarget[comment.targetId].push(comment);
      });
      return byTarget;
    },
    
    get commentsByPriority() {
      const comments = get().comments;
      const byPriority = {
        High: [],
        Medium: [],
        Low: []
      };
      comments.forEach(comment => {
        if (byPriority[comment.priority]) {
          byPriority[comment.priority].push(comment);
        }
      });
      return byPriority;
    },
    
    get unresolvedComments() {
      return get().comments.filter(comment => !comment.isResolved);
    },
    
    // Actions
    setComments: (comments) => set((state) => {
      state.comments = comments;
    }),
    
    addComment: (comment) => set((state) => {
      state.comments.push(comment);
    }),
    
    // 🟢 Complex comment creation
    createComment: (targetId, targetType, content, priority = 'Medium', uuidv4) => set((state) => {
      if (!targetId || !targetType || !content) return;
      
      const newComment = {
        id: uuidv4(),
        targetId,
        targetType,
        content: content.trim(),
        priority,
        isResolved: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      state.comments.push(newComment);
    }),
    
    updateComment: (commentId, updates) => set((state) => {
      const index = state.comments.findIndex(comment => comment.id === commentId);
      if (index !== -1) {
        Object.assign(state.comments[index], {
          ...updates,
          updatedAt: Date.now()
        });
      }
    }),
    
    deleteComment: (commentId) => set((state) => {
      state.comments = state.comments.filter(comment => comment.id !== commentId);
    }),
    
    deleteComments: (commentIds) => set((state) => {
      const idsToDelete = new Set(commentIds);
      state.comments = state.comments.filter(comment => !idsToDelete.has(comment.id));
    }),
    
    // 🟢 Target-specific operations
    deleteCommentsForTarget: (targetId) => set((state) => {
      state.comments = state.comments.filter(comment => comment.targetId !== targetId);
    }),
    
    getCommentsForTarget: (targetId) => {
      return get().comments.filter(comment => comment.targetId === targetId);
    },
    
    // 🟢 Priority management
    updateCommentPriority: (commentId, priority) => set((state) => {
      const index = state.comments.findIndex(comment => comment.id === commentId);
      if (index !== -1) {
        state.comments[index].priority = priority;
        state.comments[index].updatedAt = Date.now();
      }
    }),
    
    // 🟢 Resolution management
    toggleCommentResolution: (commentId) => set((state) => {
      const index = state.comments.findIndex(comment => comment.id === commentId);
      if (index !== -1) {
        state.comments[index].isResolved = !state.comments[index].isResolved;
        state.comments[index].updatedAt = Date.now();
      }
    }),
    
    resolveComment: (commentId) => set((state) => {
      const index = state.comments.findIndex(comment => comment.id === commentId);
      if (index !== -1) {
        state.comments[index].isResolved = true;
        state.comments[index].updatedAt = Date.now();
      }
    }),
    
    unresolveComment: (commentId) => set((state) => {
      const index = state.comments.findIndex(comment => comment.id === commentId);
      if (index !== -1) {
        state.comments[index].isResolved = false;
        state.comments[index].updatedAt = Date.now();
      }
    }),
    
    // Query helpers
    getCommentById: (id) => {
      return get().comments.find(comment => comment.id === id);
    },
    
    getCommentsByType: (targetType) => {
      return get().comments.filter(comment => comment.targetType === targetType);
    },
    
    getCommentsByPriorityLevel: (priority) => {
      return get().comments.filter(comment => comment.priority === priority);
    },
    
    // Statistics
    get stats() {
      const comments = get().comments;
      const totalComments = comments.length;
      const resolvedComments = comments.filter(comment => comment.isResolved).length;
      const byPriority = {};
      const byTargetType = {};
      
      comments.forEach(comment => {
        byPriority[comment.priority] = (byPriority[comment.priority] || 0) + 1;
        byTargetType[comment.targetType] = (byTargetType[comment.targetType] || 0) + 1;
      });
      
      return {
        total: totalComments,
        resolved: resolvedComments,
        unresolved: totalComments - resolvedComments,
        byPriority,
        byTargetType
      };
    }
  }))
);

export default useCommentStore;