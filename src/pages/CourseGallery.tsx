import React, { useState, useRef, useEffect } from 'react';
import { Course, FlashcardDeck, StandaloneQuiz, MatchingGame, WordScrambleGame, FillBlankGame } from '../types/roadmap';
import { apiPost, apiFetch } from '../lib/fetch';

interface CourseGalleryProps {
  courses: Course[];
  flashcardDecks?: FlashcardDeck[];
  standaloneQuizzes?: StandaloneQuiz[];
  matchingGames?: MatchingGame[];
  wordScrambleGames?: WordScrambleGame[];
  fillBlankGames?: FillBlankGame[];
  onSelectCourse: (course: Course) => void;
  onSelectDeck?: (deck: FlashcardDeck) => void;
  onSelectQuiz?: (quiz: StandaloneQuiz) => void;
  onSelectMatchingGame?: (game: MatchingGame) => void;
  onSelectWordScramble?: (game: WordScrambleGame) => void;
  onSelectFillBlank?: (game: FillBlankGame) => void;
  onNavigateToPrompt: () => void;
  onRefresh?: () => void;
}

type TabType = 'courses' | 'flashcards' | 'quizzes' | 'matching' | 'scramble' | 'fill-blank';

const CourseGallery: React.FC<CourseGalleryProps> = ({ 
  courses, 
  flashcardDecks = [], 
  standaloneQuizzes = [],
  matchingGames = [],
  wordScrambleGames = [],
  fillBlankGames = [],
  onSelectCourse, 
  onSelectDeck,
  onSelectQuiz,
  onSelectMatchingGame,
  onSelectWordScramble,
  onSelectFillBlank,
  onNavigateToPrompt,
  onRefresh 
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('courses');
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [savingRename, setSavingRename] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingId]);

  const startRename = (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const handleRename = async (contentType: string) => {
    if (!editingId || !editTitle.trim() || savingRename) return;
    setSavingRename(true);
    try {
      const res = await apiFetch(`/content/${contentType}/${editingId}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      if (!res.ok) throw new Error('Failed to rename');
      onRefresh?.();
      setShareToast('Renamed successfully!');
      setTimeout(() => setShareToast(null), 2000);
    } catch {
      setShareToast('Failed to rename');
      setTimeout(() => setShareToast(null), 2000);
    } finally {
      setEditingId(null);
      setSavingRename(false);
    }
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const handleShare = async (e: React.MouseEvent, contentType: string, item: { id: string; title: string; description?: string; coverImage?: string }) => {
    e.stopPropagation();
    if (sharingId) return;
    setSharingId(item.id);
    try {
      const res = await apiPost('/community/share', {
        contentType,
        contentId: item.id,
        title: item.title,
        description: item.description || '',
        coverImage: item.coverImage || null,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to share');
      
      // Build share link
      const shareUrl = `${window.location.origin}?shared=${data.id}`;
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareToast('Shared! Link copied to clipboard');
      } catch {
        setShareToast('Shared to community!');
      }
      setTimeout(() => setShareToast(null), 3000);
    } catch (err: any) {
      // Check for duplicate share
      if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
        setShareToast('Already shared!');
      } else {
        setShareToast('Failed to share');
      }
      setTimeout(() => setShareToast(null), 3000);
    } finally {
      setSharingId(null);
    }
  };

  const ShareButton = ({ contentType, item }: { contentType: string; item: { id: string; title: string; description?: string; coverImage?: string } }) => (
    <button 
      className={`share-btn ${sharingId === item.id ? 'sharing' : ''}`}
      onClick={(e) => handleShare(e, contentType, item)}
      title="Share to community"
      disabled={sharingId === item.id}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
        <circle cx="18" cy="5" r="3"/>
        <circle cx="6" cy="12" r="3"/>
        <circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
    </button>
  );

  const renderTitle = (id: string, title: string, contentType: string, extra?: React.ReactNode) => {
    if (editingId === id) {
      return (
        <div className="rename-input-wrapper" onClick={e => e.stopPropagation()}>
          <input
            ref={renameInputRef}
            className="rename-input"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleRename(contentType);
              if (e.key === 'Escape') cancelRename();
            }}
            onBlur={() => handleRename(contentType)}
            maxLength={100}
            disabled={savingRename}
          />
        </div>
      );
    }
    return (
      <h3 className="course-title">
        {title}
        {extra}
        <button className="rename-btn" onClick={e => startRename(e, id, title)} title="Rename">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </h3>
    );
  };

  // Filter flashcard decks to only show standalone ones (not from courses)
  const standaloneFlashcardDecks = flashcardDecks.filter(deck => deck.sourceType === 'standalone');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const totalItems = courses.length + standaloneFlashcardDecks.length + standaloneQuizzes.length + matchingGames.length + wordScrambleGames.length + fillBlankGames.length;

  if (totalItems === 0) {
    return (
      <div className="gallery-page">
        <div className="gallery-header">
          <h1>My Library</h1>
          <p>Your generated learning content will appear here</p>
        </div>
        
        <div className="empty-state">
          <svg className="empty-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            <line x1="12" y1="6" x2="12" y2="12"/>
            <line x1="9" y1="9" x2="15" y2="9"/>
          </svg>
          <h2>Nothing here yet</h2>
          <p>Create your first course, flashcards, or quiz to get started</p>
          <button className="btn btn-primary" onClick={onNavigateToPrompt}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Create Content
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="gallery-page">
      <div className="gallery-header">
        <h1>My Library</h1>
        <p>{totalItems} items created</p>
      </div>

      <div className="gallery-tabs">
        <button 
          className={`tab-btn ${activeTab === 'courses' ? 'active' : ''}`}
          onClick={() => setActiveTab('courses')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          Courses ({courses.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'flashcards' ? 'active' : ''}`}
          onClick={() => setActiveTab('flashcards')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="M7 8h10"/>
            <path d="M7 12h6"/>
          </svg>
          Flashcards ({standaloneFlashcardDecks.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'quizzes' ? 'active' : ''}`}
          onClick={() => setActiveTab('quizzes')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Quizzes ({standaloneQuizzes.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'matching' ? 'active' : ''}`}
          onClick={() => setActiveTab('matching')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
          Match ({matchingGames.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'scramble' ? 'active' : ''}`}
          onClick={() => setActiveTab('scramble')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16"/>
            <path d="M6 20l3-7"/>
            <path d="M18 20l-3-7"/>
            <path d="M7.5 13h9"/>
          </svg>
          Scramble ({wordScrambleGames.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'fill-blank' ? 'active' : ''}`}
          onClick={() => setActiveTab('fill-blank')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16"/>
            <path d="M4 12h8"/>
            <path d="M14 12h6" strokeDasharray="2 2"/>
            <path d="M4 17h12"/>
          </svg>
          Fill Blank ({fillBlankGames.length})
        </button>
      </div>

      {activeTab === 'courses' && (
        <div className="courses-grid">
          {courses.length === 1 && (
            <div className="first-item-hint">
              <svg className="hint-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
                <path d="M20 80 Q 30 20, 80 30" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeDasharray="5,5" fill="none"/>
                <polygon points="75,20 85,35 70,35" fill="var(--primary)"/>
              </svg>
              <span className="hint-text">🎉 Your first course! Let's start learning!</span>
            </div>
          )}
          {courses.map((course) => {
            const isImageUrl = course.coverImage && (course.coverImage.startsWith('http') || course.coverImage.startsWith('data:'));
            return (
              <div key={course.id} className="course-card" onClick={() => onSelectCourse(course)}>
                <div 
                  className="course-cover" 
                  style={isImageUrl ? {} : { background: course.coverImage || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                >
                  <ShareButton contentType="course" item={course} />
                  {isImageUrl ? (
                    <img src={course.coverImage} alt={course.title} onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    }} />
                  ) : (
                    <span className="course-cover-placeholder">📚</span>
                  )}
                </div>
                <div className="course-body">
                  {renderTitle(course.id, course.title, 'course')}
                  <p className="course-description">{course.description}</p>
                  <div className="course-meta">
                    <span>{course.totalSteps} steps</span>
                    <div className="course-progress">
                      <div className="progress-bar-small">
                        <div className="progress-fill-small" style={{ width: `${course.progress}%` }}/>
                      </div>
                      <span>{course.progress}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {courses.length === 0 && (
            <div className="empty-tab">
              <p>No courses yet. Create one from the Generate page!</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'flashcards' && (
        <div className="courses-grid">
          {standaloneFlashcardDecks.length === 1 && (
            <div className="first-item-hint">
              <svg className="hint-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
                <path d="M20 80 Q 30 20, 80 30" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeDasharray="5,5" fill="none"/>
                <polygon points="75,20 85,35 70,35" fill="var(--primary)"/>
              </svg>
              <span className="hint-text">🃏 Your first flashcard deck! Click to study!</span>
            </div>
          )}
          {standaloneFlashcardDecks.map((deck) => {
            const isImageUrl = deck.coverImage && (deck.coverImage.startsWith('http') || deck.coverImage.startsWith('data:'));
            const masteredCount = deck.cards.filter(c => c.mastered).length;
            return (
              <div key={deck.id} className="course-card flashcard-card" onClick={() => onSelectDeck?.(deck)}>
                <div 
                  className="course-cover" 
                  style={isImageUrl ? {} : { background: deck.coverImage || 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}
                >
                  <ShareButton contentType="flashcards" item={deck} />
                  {isImageUrl ? (
                    <img src={deck.coverImage} alt={deck.title} onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
                    }} />
                  ) : (
                    <span className="course-cover-placeholder">🃏</span>
                  )}
                </div>
                <div className="course-body">
                  {renderTitle(deck.id, deck.title, 'flashcards')}
                  <p className="course-description">{deck.description}</p>
                  <div className="course-meta">
                    <span>{deck.cards.length} cards</span>
                    <div className="course-progress">
                      <div className="progress-bar-small">
                        <div className="progress-fill-small" style={{ width: `${(masteredCount / deck.cards.length) * 100}%` }}/>
                      </div>
                      <span>{masteredCount}/{deck.cards.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {standaloneFlashcardDecks.length === 0 && (
            <div className="empty-tab">
              <p>No flashcard decks yet. Create one from the Generate page!</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'quizzes' && (
        <div className="courses-grid">
          {standaloneQuizzes.length === 1 && (
            <div className="first-item-hint">
              <svg className="hint-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
                <path d="M20 80 Q 30 20, 80 30" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeDasharray="5,5" fill="none"/>
                <polygon points="75,20 85,35 70,35" fill="var(--primary)"/>
              </svg>
              <span className="hint-text">❓ Your first quiz! Test your knowledge!</span>
            </div>
          )}
          {standaloneQuizzes.map((quiz) => {
            const isImageUrl = quiz.coverImage && (quiz.coverImage.startsWith('http') || quiz.coverImage.startsWith('data:'));
            return (
              <div key={quiz.id} className="course-card quiz-card" onClick={() => onSelectQuiz?.(quiz)}>
                <div 
                  className="course-cover" 
                  style={isImageUrl ? {} : { background: quiz.coverImage || 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}
                >
                  <ShareButton contentType="quiz" item={quiz} />
                  {isImageUrl ? (
                    <img src={quiz.coverImage} alt={quiz.title} onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
                    }} />
                  ) : (
                    <span className="course-cover-placeholder">{quiz.isRapid ? '⚡' : '❓'}</span>
                  )}
                </div>
                <div className="course-body">
                  {renderTitle(quiz.id, quiz.title, 'quiz', quiz.isRapid && <span className="rapid-tag">⚡ Rapid</span>)}
                  <p className="course-description">{quiz.description}</p>
                  <div className="course-meta">
                    <span>{quiz.questions.length} questions</span>
                    {quiz.isRapid && <span>{quiz.timePerQuestion}s per question</span>}
                  </div>
                </div>
              </div>
            );
          })}
          {standaloneQuizzes.length === 0 && (
            <div className="empty-tab">
              <p>No quizzes yet. Create one from the Generate page!</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'matching' && (
        <div className="courses-grid">
          {matchingGames.length === 1 && (
            <div className="first-item-hint">
              <svg className="hint-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
                <path d="M20 80 Q 30 20, 80 30" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeDasharray="5,5" fill="none"/>
                <polygon points="75,20 85,35 70,35" fill="var(--primary)"/>
              </svg>
              <span className="hint-text">🎯 Your first matching game! Have fun!</span>
            </div>
          )}
          {matchingGames.map((game) => {
            const isImageUrl = game.coverImage && (game.coverImage.startsWith('http') || game.coverImage.startsWith('data:'));
            const formatTime = (seconds: number) => {
              const mins = Math.floor(seconds / 60);
              const secs = seconds % 60;
              return `${mins}:${secs.toString().padStart(2, '0')}`;
            };
            return (
              <div key={game.id} className="course-card matching-card" onClick={() => onSelectMatchingGame?.(game)}>
                <div 
                  className="course-cover" 
                  style={isImageUrl ? {} : { background: game.coverImage || 'linear-gradient(135deg, #667eea 0%, #f093fb 100%)' }}
                >
                  <ShareButton contentType="matching" item={game} />
                  {isImageUrl ? (
                    <img src={game.coverImage} alt={game.title} onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.style.background = 'linear-gradient(135deg, #667eea 0%, #f093fb 100%)';
                    }} />
                  ) : (
                    <span className="course-cover-placeholder">🎯</span>
                  )}
                </div>
                <div className="course-body">
                  {renderTitle(game.id, game.title, 'matching')}
                  <p className="course-description">{game.description}</p>
                  <div className="course-meta">
                    <span>{game.pairs.length} pairs</span>
                    {game.bestTime && <span>Best: {formatTime(game.bestTime)}</span>}
                    {game.timesPlayed && <span>Played: {game.timesPlayed}x</span>}
                  </div>
                </div>
              </div>
            );
          })}
          {matchingGames.length === 0 && (
            <div className="empty-tab">
              <p>No matching games yet. Create one from the Generate page!</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'scramble' && (
        <div className="courses-grid">
          {wordScrambleGames.map((game) => {
            const isImageUrl = game.coverImage && (game.coverImage.startsWith('http') || game.coverImage.startsWith('data:'));
            return (
              <div key={game.id} className="course-card scramble-card" onClick={() => onSelectWordScramble?.(game)}>
                <div 
                  className="course-cover" 
                  style={isImageUrl ? {} : { background: game.coverImage || 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)' }}
                >
                  <ShareButton contentType="word-scramble" item={game} />
                  {isImageUrl ? (
                    <img src={game.coverImage} alt={game.title} onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.style.background = 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)';
                    }} />
                  ) : (
                    <span className="course-cover-placeholder">🔤</span>
                  )}
                </div>
                <div className="course-body">
                  {renderTitle(game.id, game.title, 'word-scramble')}
                  <p className="course-description">{game.description}</p>
                  <div className="course-meta">
                    <span>{game.words.length} words</span>
                    {game.bestScore != null && <span>Best: {game.bestScore}</span>}
                    {game.timesPlayed != null && <span>Played: {game.timesPlayed}x</span>}
                  </div>
                </div>
              </div>
            );
          })}
          {wordScrambleGames.length === 0 && (
            <div className="empty-tab">
              <p>No word scramble games yet. Create one from the Generate page!</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'fill-blank' && (
        <div className="courses-grid">
          {fillBlankGames.map((game) => {
            const isImageUrl = game.coverImage && (game.coverImage.startsWith('http') || game.coverImage.startsWith('data:'));
            const formatTime = (seconds: number) => {
              const mins = Math.floor(seconds / 60);
              const secs = seconds % 60;
              return `${mins}:${secs.toString().padStart(2, '0')}`;
            };
            return (
              <div key={game.id} className="course-card fill-blank-card" onClick={() => onSelectFillBlank?.(game)}>
                <div 
                  className="course-cover" 
                  style={isImageUrl ? {} : { background: game.coverImage || 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)' }}
                >
                  <ShareButton contentType="fill-blank" item={game} />
                  {isImageUrl ? (
                    <img src={game.coverImage} alt={game.title} onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.style.background = 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)';
                    }} />
                  ) : (
                    <span className="course-cover-placeholder">📝</span>
                  )}
                </div>
                <div className="course-body">
                  {renderTitle(game.id, game.title, 'fill-blank')}
                  <p className="course-description">{game.description}</p>
                  <div className="course-meta">
                    <span>{game.sentences.length} sentences</span>
                    {game.bestScore != null && <span>Best: {game.bestScore}%</span>}
                    {game.bestTime && <span>Best: {formatTime(game.bestTime)}</span>}
                    {game.timesPlayed != null && <span>Played: {game.timesPlayed}x</span>}
                  </div>
                </div>
              </div>
            );
          })}
          {fillBlankGames.length === 0 && (
            <div className="empty-tab">
              <p>No fill-in-the-blank games yet. Create one from the Generate page!</p>
            </div>
          )}
        </div>
      )}

      {/* Share Toast */}
      {shareToast && (
        <div className="share-toast">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          {shareToast}
        </div>
      )}
    </div>
  );
};

export default CourseGallery;
