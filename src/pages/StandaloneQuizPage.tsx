import React, { useState, useEffect, useCallback } from 'react';
import { StandaloneQuiz } from '../types/roadmap';
import LatexText from '../components/LatexText';

interface StandaloneQuizPageProps {
  quiz: StandaloneQuiz;
  onBack: () => void;
  onComplete: (score: number, total: number) => void;
}

const StandaloneQuizPage: React.FC<StandaloneQuizPageProps> = ({ quiz, onBack, onComplete }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(quiz.timePerQuestion || 0);
  const [isTimerActive, setIsTimerActive] = useState(quiz.isRapid);

  const handleTimeUp = useCallback(() => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setTimeLeft(quiz.timePerQuestion || 8);
    } else {
      // Auto-submit when time runs out on last question
      submitQuiz();
    }
  }, [currentQuestion, quiz.questions.length, quiz.timePerQuestion]);

  // Timer for rapid mode
  useEffect(() => {
    if (!quiz.isRapid || showResults) return;
    
    setTimeLeft(quiz.timePerQuestion || 8);
    setIsTimerActive(true);
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimeUp();
          return quiz.timePerQuestion || 8;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestion, quiz.isRapid, quiz.timePerQuestion, showResults, handleTimeUp]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showResults) return;
      
      const currentQ = quiz.questions[currentQuestion];
      const key = e.key.toLowerCase();
      
      // ABCD for selecting answers
      if (['a', 'b', 'c', 'd'].includes(key)) {
        const index = key.charCodeAt(0) - 'a'.charCodeAt(0);
        if (index < currentQ.options.length) {
          selectAnswer(currentQuestion, index);
        }
      }
      // 1234 for selecting answers
      else if (['1', '2', '3', '4'].includes(key)) {
        const index = parseInt(key) - 1;
        if (index < currentQ.options.length) {
          selectAnswer(currentQuestion, index);
        }
      }
      // Arrow keys for navigation
      else if (e.key === 'ArrowRight' && !quiz.isRapid) {
        nextQuestion();
      } else if (e.key === 'ArrowLeft' && !quiz.isRapid) {
        prevQuestion();
      }
      // Enter to submit on last question
      else if (e.key === 'Enter' && currentQuestion === quiz.questions.length - 1) {
        submitQuiz();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestion, showResults, quiz.isRapid, quiz.questions]);

  const selectAnswer = (questionIndex: number, answerIndex: number) => {
    if (showResults) return;
    setSelectedAnswers(prev => ({ ...prev, [questionIndex]: answerIndex }));
    
    // Auto-advance in rapid mode
    if (quiz.isRapid && currentQuestion < quiz.questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestion(prev => prev + 1);
      }, 300);
    }
  };

  const nextQuestion = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const submitQuiz = () => {
    let correct = 0;
    quiz.questions.forEach((q, index) => {
      if (selectedAnswers[index] === q.correctAnswer) {
        correct++;
      }
    });
    setScore(correct);
    setShowResults(true);
    setIsTimerActive(false);
    onComplete(correct, quiz.questions.length);
  };

  const retryQuiz = () => {
    setSelectedAnswers({});
    setCurrentQuestion(0);
    setShowResults(false);
    setScore(0);
    setTimeLeft(quiz.timePerQuestion || 8);
  };

  const currentQ = quiz.questions[currentQuestion];

  if (showResults) {
    const percentage = Math.round((score / quiz.questions.length) * 100);
    const passed = percentage >= 70;

    return (
      <div className="quiz-page">
        <div className="quiz-header">
          <button className="back-btn" onClick={onBack}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h1>Quiz Results</h1>
        </div>

        <div className="quiz-results">
          <div className={`results-circle ${passed ? 'passed' : 'failed'}`}>
            <span className="score-percentage">{percentage}%</span>
            <span className="score-label">{score}/{quiz.questions.length} correct</span>
          </div>
          
          <h2>{passed ? '🎉 Great Job!' : '📚 Keep Practicing!'}</h2>
          <p>
            {quiz.isRapid && `You completed this rapid quiz with ${quiz.timePerQuestion}s per question. `}
            {passed 
              ? 'You did well on this quiz!'
              : 'Review the questions below and try again.'}
          </p>

          <div className="results-breakdown">
            <h3>Question Review</h3>
            {quiz.questions.map((q, index) => {
              const isCorrect = selectedAnswers[index] === q.correctAnswer;
              return (
                <div key={index} className={`result-item ${isCorrect ? 'correct' : 'incorrect'}`}>
                  <div className="result-indicator">
                    {isCorrect ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    )}
                  </div>
                  <div className="result-content">
                    <p className="result-question"><LatexText>{q.question}</LatexText></p>
                    {!isCorrect && (
                      <p className="result-correct-answer">
                        Correct answer: <LatexText>{q.options[q.correctAnswer]}</LatexText>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="results-actions">
            <button className="btn btn-secondary" onClick={retryQuiz}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              Try Again
            </button>
            <button className="btn btn-primary" onClick={onBack}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-page">
      <div className="quiz-header">
        <button className="back-btn" onClick={onBack}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div className="quiz-header-info">
          <h1>{quiz.title}</h1>
          {quiz.isRapid && <span className="rapid-badge">⚡ Rapid Mode</span>}
        </div>
      </div>

      <div className="quiz-progress">
        <div className="progress-dots">
          {quiz.questions.map((_, index) => (
            <button
              key={index}
              className={`progress-dot ${index === currentQuestion ? 'active' : ''} ${selectedAnswers[index] !== undefined ? 'answered' : ''}`}
              onClick={() => !quiz.isRapid && setCurrentQuestion(index)}
              disabled={quiz.isRapid}
            >
              {index + 1}
            </button>
          ))}
        </div>
        <div className="progress-info">
          {quiz.isRapid && (
            <div className={`timer ${timeLeft <= 3 ? 'warning' : ''}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              {timeLeft}s
            </div>
          )}
          <span className="progress-text">
            Question {currentQuestion + 1} of {quiz.questions.length}
          </span>
        </div>
      </div>

      <div className="quiz-content">
        <div className="question-card">
          <span className="question-number">Question {currentQuestion + 1}</span>
          <p className="question-text"><LatexText>{currentQ.question}</LatexText></p>

          <div className="options-list">
            {currentQ.options.map((option, index) => (
              <button
                key={index}
                className={`option-btn ${selectedAnswers[currentQuestion] === index ? 'selected' : ''}`}
                onClick={() => selectAnswer(currentQuestion, index)}
              >
                <span className="option-letter">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="option-text"><LatexText>{option}</LatexText></span>
              </button>
            ))}
          </div>

          <div className="quiz-navigation">
            {!quiz.isRapid && (
              <button 
                className="btn btn-secondary" 
                onClick={prevQuestion}
                disabled={currentQuestion === 0}
              >
                Previous
              </button>
            )}
            
            <div style={{ flex: 1 }} />
            
            {currentQuestion === quiz.questions.length - 1 ? (
              <button 
                className="btn btn-primary"
                onClick={submitQuiz}
              >
                Submit Quiz
              </button>
            ) : !quiz.isRapid ? (
              <button 
                className="btn btn-primary"
                onClick={nextQuestion}
              >
                Next
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StandaloneQuizPage;
