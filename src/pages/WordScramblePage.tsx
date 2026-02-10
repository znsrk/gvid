import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WordScrambleGame, ScrambleWord } from '../types/roadmap';

interface WordScramblePageProps {
  game: WordScrambleGame;
  onBack: () => void;
  onUpdateGame: (game: WordScrambleGame) => void;
}

function scrambleWord(word: string): string {
  const arr = word.toUpperCase().split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // Make sure it's actually different
  const result = arr.join('');
  if (result === word.toUpperCase() && word.length > 1) {
    return scrambleWord(word);
  }
  return result;
}

const WordScramblePage: React.FC<WordScramblePageProps> = ({ game, onBack, onUpdateGame }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scrambled, setScrambled] = useState('');
  const [userInput, setUserInput] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [gameOver, setGameOver] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [shakeLetters, setShakeLetters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentWord = game.words[currentIndex];
  const totalWords = game.words.length;

  useEffect(() => {
    if (currentWord) {
      setScrambled(scrambleWord(currentWord.word));
      setUserInput('');
      setShowHint(false);
      setFeedback(null);
    }
  }, [currentIndex]);

  // Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (gameStarted && !gameOver) {
      interval = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [gameStarted, gameOver]);

  // Focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, [currentIndex, feedback]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = useCallback(() => {
    if (!currentWord || feedback) return;
    if (!gameStarted) setGameStarted(true);

    const isCorrect = userInput.toUpperCase().trim() === currentWord.word.toUpperCase();
    
    if (isCorrect) {
      setFeedback('correct');
      const hintPenalty = showHint ? 0.5 : 0;
      const difficultyBonus = currentWord.difficulty === 'hard' ? 3 : currentWord.difficulty === 'medium' ? 2 : 1;
      const streakBonus = Math.min(streak, 5) * 0.5;
      const points = Math.max(1, Math.round((difficultyBonus + streakBonus - hintPenalty) * 10) / 10);
      
      setScore(prev => prev + points);
      setStreak(prev => {
        const newStreak = prev + 1;
        setBestStreak(bs => Math.max(bs, newStreak));
        return newStreak;
      });
      setCompleted(prev => new Set([...prev, currentIndex]));
      
      setTimeout(() => moveToNext(), 1200);
    } else {
      setFeedback('wrong');
      setStreak(0);
      setShakeLetters(true);
      setTimeout(() => {
        setShakeLetters(false);
        setFeedback(null);
      }, 800);
    }
  }, [userInput, currentWord, feedback, showHint, streak, currentIndex, gameStarted]);

  const handleSkip = () => {
    if (!gameStarted) setGameStarted(true);
    setSkipped(prev => new Set([...prev, currentIndex]));
    setStreak(0);
    moveToNext();
  };

  const handleReshuffle = () => {
    if (currentWord) {
      setScrambled(scrambleWord(currentWord.word));
      setShakeLetters(true);
      setTimeout(() => setShakeLetters(false), 500);
    }
  };

  const moveToNext = () => {
    const nextUnanswered = findNextUnanswered(currentIndex + 1);
    if (nextUnanswered === -1) {
      setGameOver(true);
      const bestScore = game.bestScore || 0;
      if (score > bestScore) {
        onUpdateGame({ ...game, bestScore: score, timesPlayed: (game.timesPlayed || 0) + 1 });
      } else {
        onUpdateGame({ ...game, timesPlayed: (game.timesPlayed || 0) + 1 });
      }
    } else {
      setCurrentIndex(nextUnanswered);
    }
  };

  const findNextUnanswered = (startFrom: number): number => {
    for (let i = startFrom; i < totalWords; i++) {
      if (!completed.has(i) && !skipped.has(i)) return i;
    }
    for (let i = 0; i < startFrom; i++) {
      if (!completed.has(i) && !skipped.has(i)) return i;
    }
    // Check if skipped words remain
    for (let i = 0; i < totalWords; i++) {
      if (!completed.has(i)) return i;
    }
    return -1;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const restartGame = () => {
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setCompleted(new Set());
    setSkipped(new Set());
    setGameOver(false);
    setElapsedTime(0);
    setGameStarted(false);
    setFeedback(null);
  };

  const getDifficultyColor = (d?: string) => {
    switch (d) {
      case 'easy': return 'var(--success)';
      case 'hard': return 'var(--error)';
      default: return 'var(--warning)';
    }
  };

  if (gameOver) {
    const accuracy = Math.round((completed.size / totalWords) * 100);
    return (
      <div className="scramble-page">
        <div className="scramble-complete">
          <div className="scramble-complete-icon">
            {accuracy >= 80 ? '🏆' : accuracy >= 50 ? '⭐' : '💪'}
          </div>
          <h2>Game Complete!</h2>
          <div className="scramble-final-stats">
            <div className="stat-card">
              <span className="stat-value">{score.toFixed(1)}</span>
              <span className="stat-label">Score</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{completed.size}/{totalWords}</span>
              <span className="stat-label">Solved</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{bestStreak}</span>
              <span className="stat-label">Best Streak</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{formatTime(elapsedTime)}</span>
              <span className="stat-label">Time</span>
            </div>
          </div>
          <div className="scramble-complete-actions">
            <button className="btn btn-primary" onClick={restartGame}>Play Again</button>
            <button className="btn btn-secondary" onClick={onBack}>Back</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="scramble-page">
      <div className="scramble-header">
        <button className="back-btn" onClick={onBack}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div className="scramble-header-info">
          <h1>{game.title}</h1>
          <span className="scramble-progress-text">{completed.size + skipped.size}/{totalWords}</span>
        </div>
        <div className="scramble-stats-bar">
          <span className="scramble-stat">🔥 {streak}</span>
          <span className="scramble-stat">⭐ {score.toFixed(1)}</span>
          <span className="scramble-stat">⏱ {formatTime(elapsedTime)}</span>
        </div>
      </div>

      <div className="scramble-progress-bar">
        <div className="scramble-progress-fill" style={{ width: `${((completed.size + skipped.size) / totalWords) * 100}%` }} />
      </div>

      <div className="scramble-game-area">
        {currentWord && (
          <>
            <div className="scramble-word-info">
              {currentWord.category && (
                <span className="scramble-category">{currentWord.category}</span>
              )}
              <span className="scramble-difficulty" style={{ color: getDifficultyColor(currentWord.difficulty) }}>
                {currentWord.difficulty || 'medium'}
              </span>
            </div>

            <div className={`scramble-letters ${shakeLetters ? 'shake' : ''} ${feedback === 'correct' ? 'correct-pop' : ''}`}>
              {scrambled.split('').map((letter, i) => (
                <span key={`${i}-${letter}`} className="scramble-letter" style={{ animationDelay: `${i * 0.05}s` }}>
                  {letter}
                </span>
              ))}
            </div>

            {showHint && (
              <div className="scramble-hint">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                {currentWord.hint}
              </div>
            )}

            <div className={`scramble-input-area ${feedback === 'correct' ? 'input-correct' : feedback === 'wrong' ? 'input-wrong' : ''}`}>
              <input
                ref={inputRef}
                type="text"
                className="scramble-input"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                placeholder="Type the word..."
                disabled={feedback === 'correct'}
                autoComplete="off"
                spellCheck={false}
              />
              <button className="btn btn-primary scramble-submit" onClick={handleSubmit} disabled={!userInput.trim() || feedback === 'correct'}>
                Check
              </button>
            </div>

            <div className="scramble-actions">
              <button className="btn btn-outline" onClick={() => setShowHint(true)} disabled={showHint}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
                {showHint ? 'Hint Shown' : 'Show Hint'}
              </button>
              <button className="btn btn-outline" onClick={handleReshuffle}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10"/>
                  <polyline points="23 20 23 14 17 14"/>
                  <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/>
                </svg>
                Reshuffle
              </button>
              <button className="btn btn-outline" onClick={handleSkip}>
                Skip
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>

            {feedback === 'correct' && (
              <div className="scramble-feedback correct">
                ✓ Correct! The word is <strong>{currentWord.word.toUpperCase()}</strong>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default WordScramblePage;
