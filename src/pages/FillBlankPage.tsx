import React, { useState, useEffect, useRef } from 'react';
import { FillBlankGame, FillBlankSentence } from '../types/roadmap';
import LatexText from '../components/LatexText';

interface FillBlankPageProps {
  game: FillBlankGame;
  onBack: () => void;
  onUpdateGame: (game: FillBlankGame) => void;
}

const FillBlankPage: React.FC<FillBlankPageProps> = ({ game, onBack, onUpdateGame }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [results, setResults] = useState<Record<string, 'correct' | 'incorrect' | null>>({});
  const [showAnswer, setShowAnswer] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [startTime] = useState(() => Date.now());
  const [shakeInput, setShakeInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sentences = game.sentences;
  const currentSentence = sentences[currentIndex];
  const answeredCount = Object.keys(results).length;
  const correctCount = Object.values(results).filter(r => r === 'correct').length;

  useEffect(() => {
    inputRef.current?.focus();
    setUserAnswer('');
    setShowAnswer(false);
    setShakeInput(false);
  }, [currentIndex]);

  const checkAnswer = () => {
    if (!userAnswer.trim()) return;
    const correct = userAnswer.trim().toLowerCase() === currentSentence.answer.toLowerCase();
    setResults(prev => ({ ...prev, [currentSentence.id]: correct ? 'correct' : 'incorrect' }));
    setShowAnswer(true);
    if (!correct) {
      setShakeInput(true);
      setTimeout(() => setShakeInput(false), 500);
    }
  };

  const handleNext = () => {
    if (currentIndex < sentences.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const finalCorrect = Object.values({ ...results }).filter(r => r === 'correct').length;
      const score = Math.round((finalCorrect / sentences.length) * 100);
      setIsComplete(true);

      const update: Partial<FillBlankGame> = {
        timesPlayed: (game.timesPlayed || 0) + 1,
      };
      if (!game.bestScore || score > game.bestScore) update.bestScore = score;
      if (!game.bestTime || elapsed < game.bestTime) update.bestTime = elapsed;
      onUpdateGame({ ...game, ...update });
    }
  };

  const handleSkip = () => {
    setResults(prev => ({ ...prev, [currentSentence.id]: 'incorrect' }));
    setShowAnswer(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (showAnswer) handleNext();
      else checkAnswer();
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setResults({});
    setUserAnswer('');
    setShowAnswer(false);
    setIsComplete(false);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const getDifficultyColor = (d?: string) => {
    if (d === 'easy') return '#22c55e';
    if (d === 'hard') return '#ef4444';
    return '#f59e0b';
  };

  // ─── completion screen ───
  if (isComplete) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const finalScore = Math.round((correctCount / sentences.length) * 100);
    const circumference = 2 * Math.PI * 54;

    return (
      <div className="fb-page">
        <div className="fb-header">
          <button className="back-button" onClick={onBack}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
        </div>

        <div className="fb-complete-wrapper">
          <div className="fb-complete-card">
            <div className="fb-score-ring">
              <svg viewBox="0 0 120 120" width="148" height="148">
                <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border)" strokeWidth="8" opacity="0.3"/>
                <circle
                  cx="60" cy="60" r="54" fill="none"
                  stroke={finalScore >= 70 ? '#22c55e' : finalScore >= 40 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - finalScore / 100)}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                  className="fb-score-arc"
                />
              </svg>
              <span className="fb-score-number">{finalScore}%</span>
            </div>

            <h2 className="fb-complete-title">
              {finalScore >= 70 ? '🎉 Great job!' : finalScore >= 40 ? '💪 Keep practicing!' : '📚 Need more study'}
            </h2>
            <p className="fb-complete-stat">
              {correctCount} of {sentences.length} correct  ·  {formatTime(elapsed)}
            </p>

            {/* Mini review */}
            <div className="fb-review-grid">
              {sentences.map((s, i) => (
                <div key={s.id} className={`fb-review-dot ${results[s.id]}`} title={`#${i + 1}: ${s.answer}`}>
                  {results[s.id] === 'correct' ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  )}
                </div>
              ))}
            </div>

            <div className="fb-complete-actions">
              <button className="btn btn-primary" onClick={handleRestart}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                Play Again
              </button>
              <button className="btn btn-secondary" onClick={onBack}>Back to Library</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── game screen ───
  return (
    <div className="fb-page">
      {/* Header */}
      <div className="fb-header">
        <button className="back-button" onClick={onBack}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>
        <div className="fb-header-info">
          <h1>{game.title}</h1>
          <span className="fb-counter">{currentIndex + 1} / {sentences.length}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="fb-progress-track">
        <div className="fb-progress-fill" style={{ width: `${((answeredCount) / sentences.length) * 100}%` }}/>
      </div>

      {/* Body */}
      <div className="fb-body">
        <div className="fb-card">
          {/* Difficulty + hint row */}
          <div className="fb-meta-row">
            {currentSentence.difficulty && (
              <span className="fb-difficulty" style={{ color: getDifficultyColor(currentSentence.difficulty), borderColor: getDifficultyColor(currentSentence.difficulty) }}>
                {currentSentence.difficulty}
              </span>
            )}
            {currentSentence.hint && (
              <span className="fb-hint">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                {currentSentence.hint}
              </span>
            )}
          </div>

          {/* Sentence display */}
          <div className="fb-sentence">
            {(() => {
              const parts = currentSentence.sentence.split('___');
              return (
                <>
                  <LatexText>{parts[0]}</LatexText>
                  <span className={`fb-blank ${showAnswer ? (results[currentSentence.id] === 'correct' ? 'correct' : 'incorrect') : userAnswer ? 'active' : ''}`}>
                    {showAnswer ? currentSentence.answer : userAnswer || '...'}
                  </span>
                  {parts[1] && <LatexText>{parts[1]}</LatexText>}
                </>
              );
            })()}
          </div>

          {/* Input or feedback */}
          {!showAnswer ? (
            <div className={`fb-input-area ${shakeInput ? 'shake' : ''}`}>
              <div className="fb-input-wrap">
                <svg className="fb-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={userAnswer}
                  onChange={e => setUserAnswer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type the missing word..."
                  className="fb-input"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div className="fb-btn-row">
                <button className="btn btn-ghost" onClick={handleSkip}>Skip</button>
                <button className="btn btn-primary" onClick={checkAnswer} disabled={!userAnswer.trim()}>
                  Check Answer
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            </div>
          ) : (
            <div className={`fb-feedback ${results[currentSentence.id]}`}>
              <div className="fb-feedback-badge">
                {results[currentSentence.id] === 'correct' ? (
                  <>
                    <div className="fb-feedback-icon correct">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <span>Correct!</span>
                  </>
                ) : (
                  <>
                    <div className="fb-feedback-icon incorrect">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </div>
                    <div className="fb-feedback-text">
                      <span>Incorrect</span>
                      <span className="fb-correct-answer">Answer: <strong>{currentSentence.answer}</strong></span>
                    </div>
                  </>
                )}
              </div>
              <button className="btn btn-primary" onClick={handleNext}>
                {currentIndex < sentences.length - 1 ? 'Next' : 'See Results'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          )}
        </div>

        {/* Bottom dots */}
        <div className="fb-dots">
          {sentences.map((s, i) => (
            <button
              key={s.id}
              className={`fb-dot ${i === currentIndex ? 'current' : ''} ${results[s.id] === 'correct' ? 'correct' : results[s.id] === 'incorrect' ? 'incorrect' : ''}`}
              onClick={() => { if (results[s.id]) { setCurrentIndex(i); } }}
              title={`Question ${i + 1}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FillBlankPage;
