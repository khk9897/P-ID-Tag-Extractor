import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import { Category } from '../types';
import { CATEGORY_COLORS } from '../constants';
import { CommentModal } from './CommentModal';
import { useSidePanelStore } from '../stores/sidePanelStore';
import { TagsPanel } from './panels/TagsPanel';
import { DescriptionsPanel } from './panels/DescriptionsPanel';
import { RelationshipsPanel } from './panels/RelationshipsPanel';
import { CommentsPanel } from './panels/CommentsPanel';
import { LoopsPanel } from './panels/LoopsPanel';
import { EquipmentShortSpecsPanel } from './panels/EquipmentShortSpecsPanel';
import useCommentStore from '../stores/commentStore.js';
import { v4 as uuidv4 } from 'uuid';

// Export for backwards compatibility
export { 
  DeleteRelationshipButton, 
  DeleteTagButton, 
  EditButton, 
  SaveButton, 
  CancelButton,
  EditTagButton 
} from './common/IconButton';

export const SidePanel = ({
  // Data props
  tags, setTags, rawTextItems, descriptions, equipmentShortSpecs, setEquipmentShortSpecs, 
  loops, setLoops, relationships, setRelationships,
  // View props (currentPage now managed by zustand, keeping props for compatibility)
  currentPage: propCurrentPage, setCurrentPage: propSetCurrentPage, 
  selectedTagIds: propSelectedTagIds, setSelectedTagIds: propSetSelectedTagIds, 
  selectedDescriptionIds: propSelectedDescriptionIds, setSelectedDescriptionIds: propSetSelectedDescriptionIds,
  selectedEquipmentShortSpecIds: propSelectedEquipmentShortSpecIds, setSelectedEquipmentShortSpecIds: propSetSelectedEquipmentShortSpecIds,
  tagSelectionSource: propTagSelectionSource,
  // Action props
  onDeleteTags, onUpdateTagText, onToggleReviewStatus, onDeleteDescriptions, onUpdateDescription, 
  onDeleteEquipmentShortSpecs, onUpdateEquipmentShortSpec, onDeleteRawTextItems, onUpdateRawTextItemText,
  onAutoLinkDescriptions, onAutoLinkNotesAndHolds, onAutoLinkEquipmentShortSpecs, 
  onAutoGenerateLoops, onManualCreateLoop, onDeleteLoops, onUpdateLoop, showConfirmation,
  // Ping props
  onPingTag, onPingDescription, onPingEquipmentShortSpec, onPingRelationship,
  // Visibility props
  visibilitySettings, updateVisibilitySettings, toggleTagVisibility, toggleRelationshipVisibility, 
  toggleAllTags, toggleAllRelationships,
}) => {
  // Comment store
  const commentStore = useCommentStore();
  const comments = commentStore.comments;
  
  const {
    activeTab,
    setActiveTab,
    showCurrentPageOnly,
    setShowCurrentPageOnly,
    showRelationshipDetails,
    setShowRelationshipDetails,
    searchQuery,
    setSearchQuery,
    setDebouncedSearchQuery,
    loopSearchQuery,
    setLoopSearchQuery,
    filterCategory,
    setFilterCategory,
    reviewFilter,
    setReviewFilter,
    commentFilter,
    setCommentFilter,
    commentsTabFilter,
    setCommentsTabFilter,
    sortOrder,
    setSortOrder,
    sections,
    toggleSection,
    sidebarWidth,
    setSidebarWidth,
    isResizing,
    setIsResizing,
    commentModalOpen,
    commentTargetId,
    commentTargetName,
    commentTargetType,
    closeCommentModal,
    resetFilters,
    // Selection state from zustand
    selectedTagIds,
    selectedDescriptionIds,
    selectedEquipmentShortSpecIds,
    tagSelectionSource,
    currentPage,
    setSelectedTagIds,
    setSelectedDescriptionIds,
    setSelectedEquipmentShortSpecIds,
    setCurrentPage
  } = useSidePanelStore();

  // Use refs to prevent infinite loops in synchronization
  const propsSyncRef = useRef({ 
    lastPropUpdate: 0, 
    lastStoreUpdate: 0,
    syncing: false 
  });

  // One-way sync: Props to Zustand (only when props change externally)
  useEffect(() => {
    if (propsSyncRef.current.syncing) return;
    
    propsSyncRef.current.syncing = true;
    const now = Date.now();
    
    if (propCurrentPage !== undefined && propCurrentPage !== currentPage) {
      setCurrentPage(propCurrentPage);
    }
    
    // Only sync if props actually changed (not from our own updates)
    if (propSelectedTagIds && 
        JSON.stringify(propSelectedTagIds) !== JSON.stringify(selectedTagIds) &&
        now - propsSyncRef.current.lastStoreUpdate > 100) {
      setSelectedTagIds(propSelectedTagIds, propTagSelectionSource || 'panel');
    }
    
    if (propSelectedDescriptionIds && 
        JSON.stringify(propSelectedDescriptionIds) !== JSON.stringify(selectedDescriptionIds) &&
        now - propsSyncRef.current.lastStoreUpdate > 100) {
      setSelectedDescriptionIds(propSelectedDescriptionIds);
    }
    
    if (propSelectedEquipmentShortSpecIds && 
        JSON.stringify(propSelectedEquipmentShortSpecIds) !== JSON.stringify(selectedEquipmentShortSpecIds) &&
        now - propsSyncRef.current.lastStoreUpdate > 100) {
      setSelectedEquipmentShortSpecIds(propSelectedEquipmentShortSpecIds);
    }
    
    propsSyncRef.current.lastPropUpdate = now;
    setTimeout(() => { propsSyncRef.current.syncing = false; }, 50);
  }, [propCurrentPage, propSelectedTagIds, propSelectedDescriptionIds, propSelectedEquipmentShortSpecIds, propTagSelectionSource]);

  // One-way sync: Zustand to Props (only when store changes internally)
  useEffect(() => {
    if (propsSyncRef.current.syncing) return;
    
    const now = Date.now();
    
    // Only sync back if store changed internally (not from props)
    if (now - propsSyncRef.current.lastPropUpdate > 100) {
      propsSyncRef.current.lastStoreUpdate = now;
      
      if (propSetCurrentPage && currentPage !== propCurrentPage) {
        propSetCurrentPage(currentPage);
      }
      
      if (propSetSelectedTagIds && JSON.stringify(selectedTagIds) !== JSON.stringify(propSelectedTagIds)) {
        propSetSelectedTagIds(selectedTagIds);
      }
      
      if (propSetSelectedDescriptionIds && JSON.stringify(selectedDescriptionIds) !== JSON.stringify(propSelectedDescriptionIds)) {
        propSetSelectedDescriptionIds(selectedDescriptionIds);
      }
      
      if (propSetSelectedEquipmentShortSpecIds && JSON.stringify(selectedEquipmentShortSpecIds) !== JSON.stringify(propSelectedEquipmentShortSpecIds)) {
        propSetSelectedEquipmentShortSpecIds(selectedEquipmentShortSpecIds);
      }
    }
  }, [selectedTagIds, selectedDescriptionIds, selectedEquipmentShortSpecIds, currentPage]);

  // Debounce search query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 150);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, setDebouncedSearchQuery]);

  // Reset sort order if instrument sorting is selected but not on Instrument filter
  useEffect(() => {
    if (sortOrder === 'instrument-number-function' && filterCategory !== Category.Instrument) {
      setSortOrder('default');
    }
  }, [filterCategory, sortOrder, setSortOrder]);

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, [setIsResizing]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 200 && newWidth <= 800) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setSidebarWidth, setIsResizing]);

  // Comment modal handlers
  const handleCommentSave = useCallback((text: string, priority: string) => {
    if (commentTargetId && commentTargetType) {
      commentStore.createComment(
        commentTargetId,
        commentTargetType,
        text,
        priority as any,
        uuidv4
      );
      closeCommentModal();
    }
  }, [commentTargetId, commentTargetType, commentStore, closeCommentModal]);

  // Tab counts
  const tabCounts = useMemo(() => ({
    tags: tags.length,
    descriptions: descriptions.length,
    relationships: relationships.length,
    specs: equipmentShortSpecs.length,
    loops: loops.length,
    comments: comments.length
  }), [tags, descriptions, relationships, equipmentShortSpecs, loops, comments]);

  return (
    <>
      <div 
        className="bg-slate-800 border-l border-slate-700 flex flex-col relative"
        style={{ width: `${sidebarWidth}px` }}
      >
        {/* Resize handle */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-sky-500/50 transition-colors"
          onMouseDown={handleMouseDown}
        />


        {/* Global Filters */}
        <div className="p-3 border-b border-slate-700">
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showCurrentPageOnly}
              onChange={(e) => setShowCurrentPageOnly(e.target.checked)}
              className="w-3.5 h-3.5 bg-slate-700 border-slate-600 text-sky-500 rounded focus:ring-1 focus:ring-sky-500"
            />
            Current page only
          </label>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          {[
            { id: 'tags', label: 'Tags', count: tabCounts.tags },
            { id: 'descriptions', label: 'Desc', count: tabCounts.descriptions },
            { id: 'relationships', label: 'Rel', count: tabCounts.relationships },
            { id: 'specs', label: 'Specs', count: tabCounts.specs },
            { id: 'loops', label: 'Loops', count: tabCounts.loops },
            { id: 'comments', label: 'Comments', count: tabCounts.comments }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-2 py-2 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-slate-700 text-slate-200'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1 text-xs text-slate-500">({tab.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Filters Section */}
        {activeTab === 'tags' && (
          <div className="p-3 border-b border-slate-700 space-y-2">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 pr-8 text-sm bg-slate-700 border border-slate-600 rounded-md text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Filters Row 1 */}
            <div className="flex gap-2">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="flex-1 px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-slate-300"
              >
                <option value="All">All Categories</option>
                {Object.values(Category).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="flex-1 px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-slate-300"
              >
                <option value="default">Default Sort</option>
                <option value="page">By Page</option>
                <option value="alphabetical">A-Z</option>
                <option value="category">By Category</option>
                {filterCategory === Category.Instrument && (
                  <option value="instrument-number-function">Number→Function</option>
                )}
              </select>
            </div>

            {/* Filters Row 2 */}
            <div className="flex gap-2">
              <select
                value={reviewFilter}
                onChange={(e) => setReviewFilter(e.target.value)}
                className="flex-1 px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-slate-300"
                title="Filter by review status"
              >
                <option value="All">✅ All</option>
                <option value="Reviewed">✅ Reviewed</option>
                <option value="Not Reviewed">☐ Not Reviewed</option>
              </select>
              
              <select
                value={commentFilter}
                onChange={(e) => setCommentFilter(e.target.value)}
                className="flex-1 px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-slate-300"
                title="Filter by comment status"
              >
                <option value="All">💬 All</option>
                <option value="WithComments">💬+ With Comments</option>
                <option value="WithoutComments">💬- No Comments</option>
              </select>
            </div>

            {/* View Options */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showRelationshipDetails}
                  onChange={(e) => setShowRelationshipDetails(e.target.checked)}
                  className="w-3.5 h-3.5 bg-slate-700 border-slate-600 text-sky-500 rounded focus:ring-1 focus:ring-sky-500"
                />
                Show details
              </label>
              
              <button
                onClick={resetFilters}
                className="px-2 py-1 text-xs bg-slate-700 text-slate-400 rounded hover:bg-slate-600 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}

        {/* Loop Search for Loops tab */}
        {activeTab === 'loops' && (
          <div className="p-3 border-b border-slate-700">
            <input
              type="text"
              placeholder="Search loops..."
              value={loopSearchQuery}
              onChange={(e) => setLoopSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-slate-700 border border-slate-600 rounded-md text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        )}

        {/* Comments Filter for Comments tab */}
        {activeTab === 'comments' && (
          <div className="p-3 border-b border-slate-700">
            <select
              value={commentsTabFilter}
              onChange={(e) => setCommentsTabFilter(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-slate-300"
            >
              <option value="all">All Comments</option>
              <option value="unresolved">Unresolved</option>
              <option value="resolved">Resolved</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'tags' && (
            <TagsPanel
              tags={tags}
              setTags={setTags}
              relationships={relationships}
              descriptions={descriptions}
              equipmentShortSpecs={equipmentShortSpecs}
              loops={loops}
              rawTextItems={rawTextItems}
              onDeleteTags={onDeleteTags}
              onUpdateTagText={onUpdateTagText}
              onToggleReviewStatus={onToggleReviewStatus}
              onPingTag={onPingTag}
            />
          )}
          
          {activeTab === 'descriptions' && (
            <DescriptionsPanel
              descriptions={descriptions}
              onDeleteDescriptions={onDeleteDescriptions}
              onUpdateDescription={onUpdateDescription}
              onAutoLinkDescriptions={onAutoLinkDescriptions}
              onAutoLinkNotesAndHolds={onAutoLinkNotesAndHolds}
              onPingDescription={onPingDescription}
            />
          )}
          
          {activeTab === 'relationships' && (
            <RelationshipsPanel
              relationships={relationships}
              setRelationships={setRelationships}
              tags={tags}
              onPingRelationship={onPingRelationship}
              onPingTag={onPingTag}
            />
          )}
          
          {activeTab === 'specs' && (
            <EquipmentShortSpecsPanel
              equipmentShortSpecs={equipmentShortSpecs}
              setEquipmentShortSpecs={setEquipmentShortSpecs}
              onDeleteEquipmentShortSpecs={onDeleteEquipmentShortSpecs}
              onUpdateEquipmentShortSpec={onUpdateEquipmentShortSpec}
              onAutoLinkEquipmentShortSpecs={onAutoLinkEquipmentShortSpecs}
              onPingEquipmentShortSpec={onPingEquipmentShortSpec}
            />
          )}
          
          {activeTab === 'loops' && (
            <LoopsPanel
              loops={loops}
              setLoops={setLoops}
              tags={tags}
              onAutoGenerateLoops={onAutoGenerateLoops}
              onManualCreateLoop={onManualCreateLoop}
              onDeleteLoops={onDeleteLoops}
              onUpdateLoop={onUpdateLoop}
            />
          )}
          
          {activeTab === 'comments' && (
            <CommentsPanel
              tags={tags}
              descriptions={descriptions}
            />
          )}
        </div>
      </div>

      {/* Comment Modal */}
      {commentModalOpen && (
        <CommentModal
          isOpen={commentModalOpen}
          onClose={closeCommentModal}
          onSave={handleCommentSave}
          targetName={commentTargetName}
          existingComments={getCommentsForTarget(commentTargetId, commentTargetType)}
        />
      )}
    </>
  );
};