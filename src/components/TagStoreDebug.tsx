// TagStore 디버그 컴포넌트 - 실제 앱에서 TagStore 동작 확인
import React from 'react';
import useTagStore from '../stores/tagStore.js';

export const TagStoreDebug: React.FC = () => {
  const tagStore = useTagStore();
  
  const createTestTag = () => {
    tagStore.createTag({
      text: `STORE-${Date.now().toString().slice(-4)}`,
      category: 'Equipment',
      page: 1,
      bbox: { x1: 100, y1: 200, x2: 180, y2: 225 }
    });
  };
  
  const clearTags = () => {
    tagStore.setTags([]);
  };
  
  return (
    <div className="fixed bottom-4 right-4 bg-slate-800 text-white p-4 rounded-lg shadow-lg border border-slate-600 z-50">
      <h3 className="text-sm font-bold mb-2">🧪 TagStore 디버그</h3>
      
      <div className="space-y-2 text-xs">
        <div>총 태그: <span className="font-mono">{tagStore.tags.length}</span></div>
        <div>선택된 태그: <span className="font-mono">{tagStore.selectedTagIds.length}</span></div>
        <div>검토된 태그: <span className="font-mono">{tagStore.stats.reviewed}</span></div>
      </div>
      
      <div className="flex space-x-2 mt-3">
        <button
          onClick={createTestTag}
          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-xs rounded"
        >
          태그 생성
        </button>
        <button
          onClick={clearTags}
          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-xs rounded"
        >
          초기화
        </button>
      </div>
      
      {tagStore.tags.length > 0 && (
        <div className="mt-3 max-h-32 overflow-y-auto">
          <div className="text-xs text-slate-300">최근 태그:</div>
          {tagStore.tags.slice(-3).map(tag => (
            <div key={tag.id} className="text-xs font-mono text-green-400">
              {tag.text} ({tag.category})
            </div>
          ))}
        </div>
      )}
    </div>
  );
};