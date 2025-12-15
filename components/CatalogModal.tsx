import React, { useState, useEffect } from 'react';
import { CatalogItem } from '../types';
import { catalogService } from '../services/catalogService';
import { X, ThumbsUp, Download, PenTool, Palette } from 'lucide-react';

interface CatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (item: CatalogItem) => void;
  userId?: string;
  category: 'style' | 'color';
}

export const CatalogModal: React.FC<CatalogModalProps> = ({
  isOpen,
  onClose,
  onImport,
  userId,
  category
}) => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCatalog();
    }
  }, [isOpen, category]);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const data = await catalogService.getCatalogItems(category);
      setItems(data);
    } catch (e) {
      console.error("Failed to load catalog", e);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (itemId: string, currentVotes: number, hasVoted: boolean) => {
    if (!userId) return; // Prompt login ideally
    
    // Optimistic update
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const isUp = !hasVoted;
        return {
          ...item,
          votes: item.votes + (isUp ? 1 : -1),
          voters: isUp ? [...item.voters, userId] : item.voters.filter(v => v !== userId)
        };
      }
      return item;
    }));

    try {
      await catalogService.voteItem(itemId, userId, hasVoted ? 'down' : 'up');
    } catch (e) {
      console.error("Vote failed", e);
      // Revert on failure (could implement)
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-2xl w-full max-w-4xl h-[80vh] shadow-2xl flex flex-col relative animate-in zoom-in-95 duration-200 text-slate-900 dark:text-white">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-[#30363d]">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-gray-100 dark:bg-[#21262d] rounded-lg text-brand-teal">
                {category === 'style' ? <PenTool size={24} /> : <Palette size={24} />}
             </div>
             <div>
                <h3 className="text-xl font-bold capitalize">Community {category}s</h3>
                <p className="text-sm text-slate-500">Discover {category}s created by others.</p>
             </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#30363d] transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-[#0d1117]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <p>No {category}s found in the catalog yet.</p>
              <p className="text-xs mt-2">Be the first to contribute!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(item => (
                <div key={item.id} className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{(item.data as any).name}</h4>
                      <p className="text-[10px] text-slate-500">by {item.authorName}</p>
                    </div>
                    {item.type === 'color' && (
                      <div className="flex gap-0.5 h-6 w-20 rounded-sm overflow-hidden ring-1 ring-black/5">
                        {(item.data as any).colors.map((c: string, i: number) => (
                          <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    )}
                  </div>

                  {item.type === 'style' && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 line-clamp-3 flex-1">
                      {(item.data as any).description}
                    </p>
                  )}
                  {/* Spacer for other types to align bottom */}
                  {item.type !== 'style' && <div className="flex-1"></div>}

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#30363d] mt-auto">
                    <button 
                      onClick={() => handleVote(item.id, item.votes, userId ? item.voters.includes(userId) : false)}
                      disabled={!userId}
                      className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded transition-colors ${
                        userId && item.voters.includes(userId) 
                          ? 'text-brand-teal bg-teal-50 dark:bg-teal-900/20' 
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      <ThumbsUp size={14} />
                      {item.votes}
                    </button>
                    
                    <button 
                      onClick={() => onImport(item)}
                      className="flex items-center gap-1.5 text-xs font-bold text-white bg-brand-teal hover:bg-teal-600 px-3 py-1.5 rounded-lg shadow-sm transition-colors"
                    >
                      <Download size={14} /> Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};