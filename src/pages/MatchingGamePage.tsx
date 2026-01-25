import React, { useState, useEffect, useMemo } from 'react';
import { MatchingGame } from '../types/roadmap';
import LatexText from '../components/LatexText';
import { doAction } from '../plugins';

interface MatchingGamePageProps {
  game: MatchingGame;
  onBack: () => void;
  onUpdateGame: (game: MatchingGame) => void;
}

interface Card {
  id: string;
  pairId: string;
  content: string;
  type: 'question' | 'answer';
  isSelected: boolean;
  isMatched: boolean;
}

const MatchingGamePage: React.FC<MatchingGamePageProps> = ({ game, onBack, onUpdateGame }) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [isChecking, setIsChecking] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [mistakes, setMistakes] = useState(0);

  // Initialize cards on mount
  useEffect(() => {
    initializeGame();
  }, [game.id]);

  // Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (gameStarted && !gameComplete) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameStarted, gameComplete]);

  const initializeGame = () => {
    // Create cards from pairs
    const questionCards: Card[] = game.pairs.map(pair => ({
      id: `q-${pair.id}`,
      pairId: pair.id,
      content: pair.question,
      type: 'question' as const,
      isSelected: false,
      isMatched: false
    }));

    const answerCards: Card[] = game.pairs.map(pair => ({
      id: `a-${pair.id}`,
      pairId: pair.id,
      content: pair.answer,
      type: 'answer' as const,
      isSelected: false,
      isMatched: false
    }));

    // Combine and shuffle
    const allCards = [...questionCards, ...answerCards];
    for (let i = allCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
    }

    setCards(allCards);
    setMatchedPairs(new Set());
    setSelectedCards([]);
    setGameComplete(false);
    setElapsedTime(0);
    setMistakes(0);
    setGameStarted(false);
  };

  const handleCardClick = (card: Card) => {
    if (isChecking || card.isMatched || card.isSelected) return;

    if (!gameStarted) {
      setGameStarted(true);
      // Plugin hook: game started
      doAction('matching:gameStarted', { game, totalPairs: game.pairs.length });
    }

    // Select the card
    setCards(prev => prev.map(c => 
      c.id === card.id ? { ...c, isSelected: true } : c
    ));

    const newSelectedCards = [...selectedCards, card];
    setSelectedCards(newSelectedCards);

    if (newSelectedCards.length === 2) {
      // Two cards selected - check for match
      setIsChecking(true);
      const [first, second] = newSelectedCards;

      if (first.pairId === second.pairId && first.id !== second.id) {
        // Match found!
        // Plugin hook: match found
        doAction('matching:matchFound', { 
          game, 
          pairId: first.pairId, 
          matchedCount: matchedPairs.size + 1,
          totalPairs: game.pairs.length 
        });
        
        // Dispatch custom event for plugins that listen via DOM events
        document.dispatchEvent(new CustomEvent('oqyplus:matching:matchFound', {
          detail: { game, pairId: first.pairId, matchedCount: matchedPairs.size + 1, totalPairs: game.pairs.length }
        }));
        
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            c.pairId === first.pairId ? { ...c, isMatched: true, isSelected: false } : c
          ));
          setMatchedPairs(prev => new Set([...prev, first.pairId]));
          setSelectedCards([]);
          setIsChecking(false);

          // Check if game is complete
          if (matchedPairs.size + 1 === game.pairs.length) {
            setGameComplete(true);
            // Plugin hook: game completed
            doAction('matching:gameCompleted', { 
              game, 
              time: elapsedTime, 
              mistakes,
              isNewBestTime: !game.bestTime || elapsedTime < game.bestTime
            });
            
            // Dispatch custom event for plugins that listen via DOM events
            document.dispatchEvent(new CustomEvent('oqyplus:matching:gameCompleted', {
              detail: { game, time: elapsedTime, mistakes, isNewBestTime: !game.bestTime || elapsedTime < game.bestTime }
            }));
            
            // Update best time
            if (!game.bestTime || elapsedTime < game.bestTime) {
              onUpdateGame({
                ...game,
                bestTime: elapsedTime,
                timesPlayed: (game.timesPlayed || 0) + 1
              });
            } else {
              onUpdateGame({
                ...game,
                timesPlayed: (game.timesPlayed || 0) + 1
              });
            }
          }
        }, 500);
      } else {
        // No match - deselect after delay
        setMistakes(prev => prev + 1);
        // Plugin hook: mismatch
        doAction('matching:mismatch', { 
          game, 
          cards: [first, second], 
          mistakeCount: mistakes + 1 
        });
        
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            (c.id === first.id || c.id === second.id) && !c.isMatched
              ? { ...c, isSelected: false }
              : c
          ));
          setSelectedCards([]);
          setIsChecking(false);
        }, 1000);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="matching-game-page">
      <div className="matching-game-header">
        <button className="back-btn" onClick={onBack}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div className="matching-game-header-info">
          <h1>{game.title}</h1>
          <p>{game.description}</p>
        </div>
      </div>

      <div className="matching-game-stats">
        <div className="stat-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>{formatTime(elapsedTime)}</span>
        </div>
        <div className="stat-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span>{matchedPairs.size}/{game.pairs.length} matched</span>
        </div>
        <div className="stat-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          <span>{mistakes} mistakes</span>
        </div>
        {game.bestTime && (
          <div className="stat-item best-time">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <span>Best: {formatTime(game.bestTime)}</span>
          </div>
        )}
      </div>

      {gameComplete ? (
        <div className="matching-game-complete">
          <div className="complete-icon">🎉</div>
          <h2>Congratulations!</h2>
          <p>You matched all pairs in {formatTime(elapsedTime)} with {mistakes} mistakes!</p>
          {elapsedTime === game.bestTime && (
            <p className="new-record">🏆 New Best Time!</p>
          )}
          <div className="complete-actions">
            <button className="btn btn-primary" onClick={initializeGame}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              Play Again
            </button>
            <button className="btn btn-secondary" onClick={onBack}>
              Back to Library
            </button>
          </div>
        </div>
      ) : (
        <div className="matching-game-grid">
          {cards.map(card => (
            <div
              key={card.id}
              className={`matching-card ${card.isSelected ? 'selected' : ''} ${card.isMatched ? 'matched' : ''} ${card.type}`}
              onClick={() => handleCardClick(card)}
            >
              <div className="matching-card-inner">
                <div className="matching-card-front">
                  <LatexText>{card.content}</LatexText>
                </div>
                <div className="matching-card-back">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!gameStarted && !gameComplete && (
        <div className="matching-game-instructions">
          <p>Select a question and its matching answer to make a pair!</p>
        </div>
      )}
    </div>
  );
};

export default MatchingGamePage;
