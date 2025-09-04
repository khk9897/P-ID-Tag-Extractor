import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Category, RelationshipType, Tag, Relationship } from '../types.ts';
import { EditButton, DeleteButton, SaveButton, CancelButton } from './UIButtons.tsx';
import { v4 as uuid } from 'uuid';

interface OPCPanelProps {
  tags: Tag[];
  relationships: Relationship[];
  setRelationships: React.Dispatch<React.SetStateAction<Relationship[]>>;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  isVisible: boolean;
  onUpdateTagText: (tagId: string, newText: string) => void;
  onDeleteTags: (tagIds: string[]) => void;
  onPingTag: (tagId: string) => void;
  focusOPCConnection?: string | null;
}

interface OPCConnection {
  referenceText: string;
  tags: Tag[];
  status: 'connected' | 'ready' | 'invalid';
  pages: number[];
  relationship?: Relationship;
}

export const OPCPanel: React.FC<OPCPanelProps> = ({
  tags,
  relationships,
  setRelationships,
  currentPage,
  setCurrentPage,
  isVisible,
  onUpdateTagText,
  onDeleteTags,
  onPingTag,
  focusOPCConnection,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showCurrentPageOnly, setShowCurrentPageOnly] = useState<boolean>(true);
  const [statusFilters, setStatusFilters] = useState<{
    connected: boolean;
    ready: boolean;
    invalid: boolean;
  }>({
    connected: true,
    ready: true,
    invalid: true,
  });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const opcListRef = useRef<HTMLDivElement>(null);
  

  const opcConnections = useMemo(() => {
    const opcTags = tags.filter(tag => tag.category === Category.OffPageConnector);
    const opcRelationships = relationships.filter(rel => rel.type === RelationshipType.OffPageConnection);
    
    
    // Group OPC tags by reference text
    const groups: Record<string, OPCConnection> = {};
    
    opcTags.forEach(tag => {
      const refText = tag.text;
      if (!groups[refText]) {
        groups[refText] = {
          referenceText: refText,
          tags: [],
          status: 'invalid',
          pages: [],
          relationship: undefined,
        };
      }
      groups[refText].tags.push(tag);
      if (!groups[refText].pages.includes(tag.page)) {
        groups[refText].pages.push(tag.page);
      }
    });

    // Check connection status
    Object.values(groups).forEach(group => {
      if (group.tags.length === 2 && group.pages.length === 2) {
        const [tag1, tag2] = group.tags;
        const relationship = opcRelationships.find(rel => 
          (rel.from === tag1.id && rel.to === tag2.id) ||
          (rel.from === tag2.id && rel.to === tag1.id)
        );
        
        if (relationship) {
          group.status = 'connected';
          group.relationship = relationship;
        } else {
          group.status = 'ready';
        }
        
      } else {
        group.status = 'invalid';
      }
    });

    return Object.values(groups).sort((a, b) => a.referenceText.localeCompare(b.referenceText));
  }, [tags, relationships]);

  const filteredConnections = useMemo(() => {
    let connections = opcConnections;
    
    // Filter by current page if enabled
    if (showCurrentPageOnly) {
      connections = connections.filter(conn => conn.pages.includes(currentPage));
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      connections = connections.filter(conn => 
        conn.referenceText.toLowerCase().includes(lowerSearchTerm) ||
        conn.pages.some(page => page.toString().includes(lowerSearchTerm))
      );
    }
    
    // Filter by status
    connections = connections.filter(conn => statusFilters[conn.status]);
    
    return connections;
  }, [opcConnections, searchTerm, showCurrentPageOnly, currentPage, statusFilters]);

  const handlePageNavigation = (page: number) => {
    setCurrentPage(page);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const toggleExpanded = (referenceText: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(referenceText)) {
        next.delete(referenceText);
      } else {
        next.add(referenceText);
      }
      return next;
    });
  };

  const handleConnect = (connection: OPCConnection) => {
    if (connection.tags.length === 2 && connection.status === 'ready') {
      const [tag1, tag2] = connection.tags;
      const newRelationship: Relationship = {
        id: uuid(),
        type: RelationshipType.OffPageConnection,
        from: tag1.id,
        to: tag2.id,
      };
      setRelationships(prev => [...prev, newRelationship]);
    }
  };

  const handleDisconnect = (connection: OPCConnection) => {
    if (connection.relationship) {
      setRelationships(prev => 
        prev.filter(r => r.id !== connection.relationship?.id)
      );
    }
  };

  const handleEditTag = (tagId: string, text: string) => {
    setEditingTagId(tagId);
    setEditText(text);
  };

  const handleSaveEdit = () => {
    if (editingTagId && editText.trim()) {
      onUpdateTagText(editingTagId, editText.trim());
      setEditingTagId(null);
      setEditText('');
    }
  };

  const handleCancelEdit = () => {
    setEditingTagId(null);
    setEditText('');
  };

  const handleDeleteTag = (tagId: string) => {
    if (window.confirm('Are you sure you want to delete this OPC tag?')) {
      // Find and delete associated relationships
      const associatedRelationships = relationships.filter(r => 
        (r.type === RelationshipType.OffPageConnection) && 
        (r.from === tagId || r.to === tagId)
      );
      
      if (associatedRelationships.length > 0) {
        setRelationships(prev => 
          prev.filter(r => !associatedRelationships.some(ar => ar.id === r.id))
        );
      }
      
      onDeleteTags([tagId]);
    }
  };

  const handleTagClick = (tag: Tag) => {
    setCurrentPage(tag.page);
    onPingTag(tag.id);
  };

  // Focus on OPC connection when focusOPCConnection prop changes
  useEffect(() => {
    if (focusOPCConnection && isVisible) {
      // Find the connection that contains the tag
      const targetConnection = opcConnections.find(conn => 
        conn.tags.some(tag => tag.text === focusOPCConnection)
      );
      
      if (targetConnection) {
        // Expand the group
        setExpandedGroups(prev => new Set([...prev, targetConnection.referenceText]));
        
        // Scroll to the connection after a short delay to ensure DOM is updated
        setTimeout(() => {
          const connectionElement = document.querySelector(`[data-connection-ref="${targetConnection.referenceText}"]`);
          if (connectionElement && opcListRef.current) {
            connectionElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
            
            // Add temporary highlight effect
            connectionElement.classList.add('animate-pulse', 'bg-violet-500/20');
            setTimeout(() => {
              connectionElement.classList.remove('animate-pulse', 'bg-violet-500/20');
            }, 2000);
          }
        }, 100);
      }
    }
  }, [focusOPCConnection, isVisible, opcConnections]);

  if (!isVisible) return null;

  return (
    <div className="bg-slate-800 border-l border-slate-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-lg font-bold text-white mb-3">OPC Connections</h3>
        
        {/* Search */}
        <div className="relative mb-3">
          <input
            type="text"
            placeholder="Search OPC references..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 pr-8 bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-2 text-slate-400 hover:text-white"
            >
              ×
            </button>
          )}
        </div>

        {/* Page Filter */}
        <div className="flex items-center space-x-2 mb-3">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCurrentPageOnly}
              onChange={(e) => setShowCurrentPageOnly(e.target.checked)}
              className="w-4 h-4 text-violet-600 bg-slate-900 border-slate-600 rounded focus:ring-violet-500 focus:ring-1"
            />
            <span className="text-sm text-slate-300">Current Page Only</span>
          </label>
          {showCurrentPageOnly && (
            <span className="text-xs text-violet-400 font-medium">
              Page {currentPage}
            </span>
          )}
        </div>

        {/* Status Filters */}
        <div className="space-y-2">
          <span className="text-sm text-slate-400 font-medium">Status Filter:</span>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={statusFilters.connected}
                onChange={(e) => setStatusFilters(prev => ({
                  ...prev,
                  connected: e.target.checked
                }))}
                className="w-4 h-4 text-green-600 bg-slate-900 border-slate-600 rounded focus:ring-green-500 focus:ring-1"
              />
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-slate-300">Connected</span>
              </div>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={statusFilters.ready}
                onChange={(e) => setStatusFilters(prev => ({
                  ...prev,
                  ready: e.target.checked
                }))}
                className="w-4 h-4 text-yellow-600 bg-slate-900 border-slate-600 rounded focus:ring-yellow-500 focus:ring-1"
              />
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-sm text-slate-300">Ready</span>
              </div>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={statusFilters.invalid}
                onChange={(e) => setStatusFilters(prev => ({
                  ...prev,
                  invalid: e.target.checked
                }))}
                className="w-4 h-4 text-red-600 bg-slate-900 border-slate-600 rounded focus:ring-red-500 focus:ring-1"
              />
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm text-slate-300">Invalid</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-700 text-sm">
        <div className="flex justify-between text-slate-300">
          <span>
            {showCurrentPageOnly ? 'Current Page' : 'Total'}: {filteredConnections.length}
          </span>
          <div className="flex space-x-3">
            <span className="text-green-400">
              Connected: {filteredConnections.filter(conn => conn.status === 'connected').length}
            </span>
            <span className="text-yellow-400">
              Ready: {filteredConnections.filter(conn => conn.status === 'ready').length}
            </span>
            <span className="text-red-400">
              Invalid: {filteredConnections.filter(conn => conn.status === 'invalid').length}
            </span>
          </div>
        </div>
      </div>

      {/* OPC List */}
      <div className="flex-1 overflow-y-auto" ref={opcListRef}>
        {filteredConnections.length === 0 ? (
          <div className="p-4 text-center text-slate-400">
            {searchTerm ? 'No OPC connections match your search' : 'No OPC connections found'}
          </div>
        ) : (
          <div className="space-y-2 p-2">
            {filteredConnections.map((connection) => {
              const isExpanded = expandedGroups.has(connection.referenceText);
              const statusColors = {
                connected: { dot: 'bg-green-500', text: 'text-green-400', label: 'Connected' },
                ready: { dot: 'bg-yellow-500', text: 'text-yellow-400', label: 'Ready to Connect' },
                invalid: { dot: 'bg-red-500', text: 'text-red-400', label: 'Invalid' }
              };
              const status = statusColors[connection.status];

              return (
                <div
                  key={connection.referenceText}
                  data-connection-ref={connection.referenceText}
                  className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden"
                >
                  {/* Header - Clickable */}
                  <div
                    className="p-2 hover:bg-slate-800/50 transition-colors cursor-pointer"
                    onClick={() => toggleExpanded(connection.referenceText)}
                  >
                    <div className="flex items-center justify-between">
                      {/* Left: Expand arrow + Reference + Status */}
                      <div className="flex items-center space-x-3">
                        <span className={`transition-transform duration-200 text-xs ${isExpanded ? 'rotate-90' : ''}`}>
                          ▶
                        </span>
                        <span className="text-sm font-mono text-white">
                          {connection.referenceText}
                        </span>
                        <div className={`w-2 h-2 rounded-full ${status.dot}`} />
                        <span className={`text-xs ${status.text}`}>
                          {status.label}
                        </span>
                        {connection.status === 'connected' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDisconnect(connection);
                            }}
                            className="ml-2 p-1 rounded-full text-slate-400 hover:text-red-400 hover:bg-red-500/20 transition-colors"
                            title="Disconnect"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      
                      {/* Right: Page buttons */}
                      <div className="flex items-center space-x-1">
                        {connection.pages.sort((a, b) => a - b).map(page => (
                          <button
                            key={page}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePageNavigation(page);
                            }}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              page === currentPage
                                ? 'bg-violet-500/20 text-violet-400 border border-violet-400'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                            }`}
                          >
                            P{page}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-slate-700 p-3 bg-slate-800/30">
                      {/* Tags */}
                      <div className="space-y-2 mb-3">
                        {connection.tags.sort((a, b) => a.page - b.page).map(tag => (
                          <div key={tag.id} className="group flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-slate-400">P{tag.page}:</span>
                              {editingTagId === tag.id ? (
                                <>
                                  <input
                                    type="text"
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveEdit();
                                      if (e.key === 'Escape') handleCancelEdit();
                                    }}
                                    className="px-2 py-1 text-xs bg-slate-700 border border-violet-400 rounded text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                                    autoFocus
                                  />
                                  <SaveButton onClick={handleSaveEdit} />
                                  <CancelButton onClick={handleCancelEdit} />
                                </>
                              ) : (
                                <>
                                  <span 
                                    className="text-sm text-white font-mono cursor-pointer hover:text-blue-400 hover:underline transition-colors" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTagClick(tag);
                                    }}
                                    title={`Click to go to page ${tag.page} and center on tag`}
                                  >
                                    {tag.text}
                                  </span>
                                  <EditButton onClick={() => handleEditTag(tag.id, tag.text)} />
                                  <DeleteButton onClick={() => handleDeleteTag(tag.id)} />
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        {/* Missing tag indicator */}
                        {connection.status === 'invalid' && connection.tags.length === 1 && (
                          <div className="flex items-center space-x-2 text-red-400">
                            <span className="text-xs">P{connection.tags[0].page === 1 ? 2 : 1}:</span>
                            <span className="text-xs italic">(Missing OPC tag)</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      {connection.status === 'ready' && (
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleConnect(connection)}
                            className="px-3 py-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-400/50 rounded text-sm font-medium transition-colors"
                          >
                            Connect
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-700 bg-slate-900/50">
        <div className="text-xs text-slate-400 text-center">
          Click OPC entries to navigate between pages
        </div>
      </div>
    </div>
  );
};