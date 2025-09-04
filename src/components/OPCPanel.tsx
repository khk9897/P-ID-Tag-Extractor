import React, { useState, useMemo } from 'react';
import { Category, RelationshipType, Tag, Relationship } from '../types.ts';

interface OPCPanelProps {
  tags: Tag[];
  relationships: Relationship[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  isVisible: boolean;
}

interface OPCConnection {
  referenceText: string;
  tags: Tag[];
  isConnected: boolean;
  pages: number[];
}

export const OPCPanel: React.FC<OPCPanelProps> = ({
  tags,
  relationships,
  currentPage,
  setCurrentPage,
  isVisible,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showCurrentPageOnly, setShowCurrentPageOnly] = useState<boolean>(false);
  
  console.log(`[OPC Panel] isVisible: ${isVisible}`);

  const opcConnections = useMemo(() => {
    const opcTags = tags.filter(tag => tag.category === Category.OffPageConnector);
    const opcRelationships = relationships.filter(rel => rel.type === RelationshipType.OffPageConnection);
    
    console.log(`[OPC Panel] Found ${opcTags.length} OPC tags and ${opcRelationships.length} OPC relationships`);
    
    // Group OPC tags by reference text
    const groups: Record<string, OPCConnection> = {};
    
    opcTags.forEach(tag => {
      const refText = tag.text;
      if (!groups[refText]) {
        groups[refText] = {
          referenceText: refText,
          tags: [],
          isConnected: false,
          pages: [],
        };
      }
      groups[refText].tags.push(tag);
      if (!groups[refText].pages.includes(tag.page)) {
        groups[refText].pages.push(tag.page);
      }
    });

    // Check if connections exist
    Object.values(groups).forEach(group => {
      if (group.tags.length === 2 && group.pages.length === 2) {
        const [tag1, tag2] = group.tags;
        const hasConnection = opcRelationships.some(rel => 
          (rel.from === tag1.id && rel.to === tag2.id) ||
          (rel.from === tag2.id && rel.to === tag1.id)
        );
        group.isConnected = hasConnection;
        
        console.log(`[OPC Panel] Checking connection for "${group.referenceText}":`, {
          tag1: `${tag1.id} (page ${tag1.page})`,
          tag2: `${tag2.id} (page ${tag2.page})`,
          opcRelationshipsCount: opcRelationships.length,
          hasConnection,
          matchingRels: opcRelationships.filter(rel => 
            (rel.from === tag1.id && rel.to === tag2.id) ||
            (rel.from === tag2.id && rel.to === tag1.id)
          )
        });
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
    
    return connections;
  }, [opcConnections, searchTerm, showCurrentPageOnly, currentPage]);

  const handlePageNavigation = (page: number) => {
    setCurrentPage(page);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

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
        <div className="flex items-center space-x-2">
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
      </div>

      {/* Statistics */}
      <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-700 text-sm">
        <div className="flex justify-between text-slate-300">
          <span>
            {showCurrentPageOnly ? 'Current Page' : 'Total'} OPC: {filteredConnections.length}
          </span>
          <span>Connected: {filteredConnections.filter(conn => conn.isConnected).length}</span>
        </div>
      </div>

      {/* OPC List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConnections.length === 0 ? (
          <div className="p-4 text-center text-slate-400">
            {searchTerm ? 'No OPC connections match your search' : 'No OPC connections found'}
          </div>
        ) : (
          <div className="space-y-2 p-2">
            {filteredConnections.map((connection) => (
              <div
                key={connection.referenceText}
                className="bg-slate-900 rounded-lg border border-slate-700 p-2 hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  {/* Left: Reference + Status */}
                  <div className="flex items-center space-x-3">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-violet-500/20 text-violet-400 border border-violet-400">
                      {connection.referenceText}
                    </span>
                    <div className={`w-2 h-2 rounded-full ${connection.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className={`text-xs ${connection.isConnected ? 'text-green-400' : 'text-red-400'}`}>
                      {connection.isConnected ? 'Connected' : 'Invalid'}
                    </span>
                  </div>
                  
                  {/* Right: Page buttons */}
                  <div className="flex items-center space-x-1">
                    {connection.pages.sort((a, b) => a - b).map(page => (
                      <button
                        key={page}
                        onClick={() => handlePageNavigation(page)}
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
            ))}
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