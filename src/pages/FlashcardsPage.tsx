import React, { useState, useEffect, useCallback } from 'react';
import { Flashcard, FlashcardDeck } from '../types/roadmap';
import LatexText from '../components/LatexText';
import { doAction, applyFilters } from '../plugins';

interface FlashcardsPageProps {
  deck: FlashcardDeck;
  onBack: () => void;
  onUpdateDeck?: (deck: FlashcardDeck) => void;
}

const FlashcardsPage: React.FC<FlashcardsPageProps> = ({ deck, onBack, onUpdateDeck }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyMode, setStudyMode] = useState<'all' | 'unmastered'>('unmastered');
  const [shuffled, setShuffled] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>(deck.cards);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    let filteredCards = deck.cards;
    if (studyMode === 'unmastered') {
      filteredCards = deck.cards.filter(c => !c.mastered);
    }
    if (shuffled) {
      filteredCards = [...filteredCards].sort(() => Math.random() - 0.5);
    }
    setCards(filteredCards);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [deck.cards, studyMode, shuffled]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    // Plugin hook: card flipped
    doAction('flashcard:flipped', { card: currentCard, isFlipped: !isFlipped, deck });
  };

  const handleNext = async () => {
    if (currentIndex < cards.length - 1 && !isTransitioning) {
      setIsExiting(true);
      setIsTransitioning(true);
      
      // Plugin hook: filter next card selection
      let nextIndex = currentIndex + 1;
      nextIndex = await applyFilters('flashcard:selectNext', nextIndex, { cards, currentIndex, deck });
      
      setTimeout(() => {
        setCurrentIndex(nextIndex);
        setIsFlipped(false);
        setIsExiting(false);
        setTimeout(() => setIsTransitioning(false), 100);
      }, 350);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0 && !isTransitioning) {
      setIsExiting(true);
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(currentIndex - 1);
        setIsFlipped(false);
        setIsExiting(false);
        setTimeout(() => setIsTransitioning(false), 100);
      }, 350);
    }
  };

  const toggleMastered = useCallback(() => {
    if (!onUpdateDeck) return;
    setCurrentIndex(idx => {
      const currentCard = cards[idx];
      if (currentCard) {
        const newMasteredState = !currentCard.mastered;
        const updatedCards = deck.cards.map(c => 
          c.id === currentCard.id ? { ...c, mastered: newMasteredState } : c
        );
        onUpdateDeck({ ...deck, cards: updatedCards });
        
        // Plugin hook: card mastered status changed
        doAction('flashcard:masteredChanged', { 
          card: currentCard, 
          mastered: newMasteredState, 
          deck 
        });
      }
      return idx;
    });
  }, [onUpdateDeck, cards, deck]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      setIsFlipped(prev => !prev);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      setCurrentIndex(prev => {
        if (prev < cards.length - 1 && !isTransitioning) {
          setIsExiting(true);
          setIsTransitioning(true);
          setTimeout(() => {
            setIsFlipped(false);
            setIsExiting(false);
            setTimeout(() => setIsTransitioning(false), 100);
          }, 350);
          return prev + 1;
        }
        return prev;
      });
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      setCurrentIndex(prev => {
        if (prev > 0 && !isTransitioning) {
          setIsExiting(true);
          setIsTransitioning(true);
          setTimeout(() => {
            setIsFlipped(false);
            setIsExiting(false);
            setTimeout(() => setIsTransitioning(false), 100);
          }, 350);
          return prev - 1;
        }
        return prev;
      });
    } else if (e.key.toLowerCase() === 'm') {
      toggleMastered();
    }
  }, [cards.length, isTransitioning, toggleMastered]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const currentCard = cards[currentIndex];
  const masteredCount = deck.cards.filter(c => c.mastered).length;
  const progress = Math.round((masteredCount / deck.cards.length) * 100);

  if (cards.length === 0) {
    return (
      <div className="flashcards-page">
        <div className="flashcards-header">
          <button className="back-btn" onClick={onBack}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h1>{deck.title}</h1>
        </div>
        <div className="flashcards-empty">
          <p>{studyMode === 'unmastered' ? 'All cards mastered! 🎉' : 'No flashcards available.'}</p>
          {studyMode === 'unmastered' && (
            <button className="btn btn-primary" onClick={() => setStudyMode('all')}>
              Study All Cards
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flashcards-page">
      <div className="flashcards-header">
        <button className="back-btn" onClick={onBack}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div className="flashcards-header-info">
          <h1>{deck.title}</h1>
          <span className="flashcards-count">{currentIndex + 1} / {cards.length}</span>
        </div>
      </div>

      <div className="flashcards-toolbar">
        <div className="toolbar-left">
          <button 
            className={`toolbar-btn ${studyMode === 'all' ? 'active' : ''}`}
            onClick={() => setStudyMode('all')}
          >
            All ({deck.cards.length})
          </button>
          <button 
            className={`toolbar-btn ${studyMode === 'unmastered' ? 'active' : ''}`}
            onClick={() => setStudyMode('unmastered')}
          >
            Unmastered ({deck.cards.length - masteredCount})
          </button>
        </div>
        <div className="toolbar-right">
          <button 
            className={`toolbar-btn ${shuffled ? 'active' : ''}`}
            onClick={() => setShuffled(!shuffled)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 3 21 3 21 8"/>
              <line x1="4" y1="20" x2="21" y2="3"/>
              <polyline points="21 16 21 21 16 21"/>
              <line x1="15" y1="15" x2="21" y2="21"/>
              <line x1="4" y1="4" x2="9" y2="9"/>
            </svg>
            Shuffle
          </button>
        </div>
      </div>

      <div className="flashcards-progress">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}/>
        </div>
        <span className="progress-text">{masteredCount} of {deck.cards.length} mastered ({progress}%)</span>
      </div>

      <div className="flashcard-container" onClick={handleFlip}>
        <div className={`flashcard-wrapper ${isTransitioning ? 'transitioning' : ''}`}>
          <div className="flashcard-shadow-2"></div>
          <div className="flashcard-shadow"></div>
          <div className={`flashcard ${isFlipped ? 'flipped' : ''} ${isExiting ? 'exiting' : ''}`}>
            <div className="flashcard-front">
              <div className="card-content">
                {currentCard.category && (
                  <span className="card-category">{currentCard.category}</span>
                )}
                <p className="card-text"><LatexText>{currentCard.front}</LatexText></p>
              </div>
              <span className="flip-hint">Click or press Space to flip</span>
            </div>
            <div className="flashcard-back">
              <div className="card-content">
                <p className="card-text"><LatexText>{currentCard.back}</LatexText></p>
              </div>
              <span className="flip-hint">Click or press Space to flip back</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flashcards-controls">
        <button 
          className="btn btn-secondary" 
          onClick={handlePrev}
          disabled={currentIndex === 0}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Previous
        </button>
        
        <button 
          className={`btn ${currentCard.mastered ? 'btn-primary' : 'btn-secondary'}`}
          onClick={(e) => { e.stopPropagation(); toggleMastered(); }}
        >
          {currentCard.mastered ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Mastered
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
              </svg>
              Mark Mastered
            </>
          )}
        </button>

        <button 
          className="btn btn-secondary" 
          onClick={handleNext}
          disabled={currentIndex === cards.length - 1}
        >
          Next
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default FlashcardsPage;
