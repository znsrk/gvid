import React, { useState, useEffect } from 'react';
import { apiFetch, apiPost, apiDelete } from '../lib/fetch';

interface SharedItem {
  id: string;
  contentType: 'course' | 'flashcards' | 'quiz' | 'matching' | 'word-scramble' | 'fill-blank';
  contentId: string;
  title: string;
  description: string;
  coverImage?: string;
  authorName: string;
  authorId: string;
  likes: number;
  hasLiked: boolean;
  createdAt: string;
  meta?: Record<string, any>;
}

type FilterType = 'all' | 'course' | 'flashcards' | 'quiz' | 'matching' | 'word-scramble' | 'fill-blank';

interface CommunityPageProps {
  onBack: () => void;
  onImport: (item: SharedItem) => void;
}

const contentTypeLabels: Record<string, string> = {
  course: 'Course',
  flashcards: 'Flashcards',
  quiz: 'Quiz',
  matching: 'Match Game',
  'word-scramble': 'Scramble',
  'fill-blank': 'Fill Blank',
};

const contentTypeIcons: Record<string, string> = {
  course: '📚',
  flashcards: '🃏',
  quiz: '❓',
  matching: '🎯',
  'word-scramble': '🔤',
  'fill-blank': '📝',
};

const CommunityPage: React.FC<CommunityPageProps> = ({ onBack, onImport }) => {
  const [items, setItems] = useState<SharedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');
  const [importing, setImporting] = useState<string | null>(null);
  const [likingIds, setLikingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCommunityContent();
  }, [filter, sortBy]);

  const loadCommunityContent = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('type', filter);
      params.set('sort', sortBy);
      if (searchQuery) params.set('q', searchQuery);
      
      const res = await apiFetch(`/community?${params.toString()}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load community content:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadCommunityContent();
  };

  const handleLike = async (itemId: string) => {
    // Prevent concurrent likes on the same item
    if (likingIds.has(itemId)) return;

    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Lock this item
    setLikingIds(prev => new Set(prev).add(itemId));

    // Optimistic update immediately
    const wasLiked = item.hasLiked;
    setItems(prev => prev.map(i =>
      i.id === itemId
        ? { ...i, likes: i.likes + (wasLiked ? -1 : 1), hasLiked: !wasLiked }
        : i
    ));

    try {
      if (wasLiked) {
        await apiDelete(`/community/${itemId}/like`);
      } else {
        await apiPost(`/community/${itemId}/like`, {});
      }
    } catch (err) {
      // Revert on failure
      setItems(prev => prev.map(i =>
        i.id === itemId
          ? { ...i, likes: i.likes + (wasLiked ? 1 : -1), hasLiked: wasLiked }
          : i
      ));
      console.error('Failed to toggle like:', err);
    } finally {
      setLikingIds(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleImport = async (item: SharedItem) => {
    setImporting(item.id);
    try {
      const res = await apiFetch(`/community/${item.id}/clone`);
      const data = await res.json();
      onImport(item);
    } catch (err) {
      console.error('Failed to import:', err);
    } finally {
      setImporting(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="community-page">
      <div className="community-header">
        <button className="back-button" onClick={onBack}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>
        <div>
          <h1>Community</h1>
          <p className="community-subtitle">Discover and share learning content</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="community-controls">
        <form onSubmit={handleSearch} className="community-search">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input 
            type="text" 
            placeholder="Search community content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        <div className="community-filters">
          <div className="filter-tabs">
            {(['all', 'quiz', 'flashcards', 'matching', 'word-scramble', 'fill-blank', 'course'] as FilterType[]).map(f => (
              <button
                key={f}
                className={`filter-tab ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? '🌐 All' : `${contentTypeIcons[f]} ${contentTypeLabels[f]}`}
              </button>
            ))}
          </div>
          <div className="sort-toggle">
            <button 
              className={`sort-btn ${sortBy === 'recent' ? 'active' : ''}`}
              onClick={() => setSortBy('recent')}
            >
              New
            </button>
            <button 
              className={`sort-btn ${sortBy === 'popular' ? 'active' : ''}`}
              onClick={() => setSortBy('popular')}
            >
              Popular
            </button>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
          <div className="loading-dots">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="community-empty">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <h3>No shared content yet</h3>
          <p>Be the first to share your learning materials with the community!</p>
        </div>
      ) : (
        <div className="community-grid">
          {items.map((item) => {
            const isImageUrl = item.coverImage && (item.coverImage.startsWith('http') || item.coverImage.startsWith('data:'));
            return (
              <div key={item.id} className="community-card">
                <div 
                  className="community-card-cover"
                  style={isImageUrl ? {} : { background: item.coverImage || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                >
                  {isImageUrl ? (
                    <img src={item.coverImage} alt={item.title} onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    }} />
                  ) : (
                    <span className="community-card-icon">{contentTypeIcons[item.contentType]}</span>
                  )}
                  <span className="community-type-badge">
                    {contentTypeLabels[item.contentType]}
                  </span>
                </div>
                <div className="community-card-body">
                  <h3>{item.title}</h3>
                  <p className="community-card-desc">{item.description}</p>
                  <div className="community-card-meta">
                    <span className="community-author">
                      <span className="author-avatar">{item.authorName[0]?.toUpperCase()}</span>
                      {item.authorName}
                    </span>
                    <span className="community-date">{formatDate(item.createdAt)}</span>
                  </div>
                  <div className="community-card-actions">
                    <button 
                      className={`like-btn ${item.hasLiked ? 'liked' : ''}`}
                      onClick={() => handleLike(item.id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={item.hasLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                      {item.likes}
                    </button>
                    <button 
                      className="import-btn"
                      onClick={() => handleImport(item)}
                      disabled={importing === item.id}
                    >
                      {importing === item.id ? 'Adding...' : '+ Add to Library'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CommunityPage;
