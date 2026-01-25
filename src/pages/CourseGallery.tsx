import React, { useState } from 'react';
import { Course, FlashcardDeck, StandaloneQuiz, MatchingGame } from '../types/roadmap';

interface CourseGalleryProps {
  courses: Course[];
  flashcardDecks?: FlashcardDeck[];
  standaloneQuizzes?: StandaloneQuiz[];
  matchingGames?: MatchingGame[];
  onSelectCourse: (course: Course) => void;
  onSelectDeck?: (deck: FlashcardDeck) => void;
  onSelectQuiz?: (quiz: StandaloneQuiz) => void;
  onSelectMatchingGame?: (game: MatchingGame) => void;
  onNavigateToPrompt: () => void;
}

type TabType = 'courses' | 'flashcards' | 'quizzes' | 'matching';

const CourseGallery: React.FC<CourseGalleryProps> = ({ 
  courses, 
  flashcardDecks = [], 
  standaloneQuizzes = [],
  matchingGames = [],
  onSelectCourse, 
  onSelectDeck,
  onSelectQuiz,
  onSelectMatchingGame,
  onNavigateToPrompt 
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('courses');

  // Filter flashcard decks to only show standalone ones (not from courses)
  const standaloneFlashcardDecks = flashcardDecks.filter(deck => deck.sourceType === 'standalone');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const totalItems = courses.length + standaloneFlashcardDecks.length + standaloneQuizzes.length + matchingGames.length;

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
                  <h3 className="course-title">{course.title}</h3>
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
                  <h3 className="course-title">{deck.title}</h3>
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
                  <h3 className="course-title">
                    {quiz.title}
                    {quiz.isRapid && <span className="rapid-tag">⚡ Rapid</span>}
                  </h3>
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
                  <h3 className="course-title">{game.title}</h3>
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
    </div>
  );
};

export default CourseGallery;
