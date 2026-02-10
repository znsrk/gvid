import React, { useState, useEffect, useRef } from 'react';
import { CourseStep, QuizQuestion } from '../types/roadmap';
import LatexText from '../components/LatexText';
import { doAction, applyFilters, applyFiltersSync } from '../plugins';
import { apiPost } from '../lib/fetch';

interface QuizPageProps {
  step: CourseStep;
  courseTitle: string;
  onBack: () => void;
  onComplete: (score: number, total: number, questions: QuizQuestion[]) => void;
  onLoadingChange: (loading: boolean, message?: string) => void;
}

const QuizPage: React.FC<QuizPageProps> = ({ 
  step, 
  courseTitle, 
  onBack, 
  onComplete,
  onLoadingChange 
}) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [quizGenerated, setQuizGenerated] = useState(false);
  const [showingFeedback, setShowingFeedback] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Check if quiz already exists and has questions
    if (step.test?.questions && step.test.questions.length > 0) {
      setQuestions(step.test.questions);
      setQuizGenerated(true);
    }
    // Only generate if no existing quiz and not already generated this session
    // Removed auto-generation - user must click button to generate
  }, [step.id, step.test?.questions]);

  const loadQuiz = async () => {
    // Don't regenerate if quiz already exists
    if (step.test?.questions && step.test.questions.length > 0) {
      setQuestions(step.test.questions);
      setQuizGenerated(true);
      return;
    }
    
    setLoading(true);
    onLoadingChange(true, 'Generating 20 quiz questions...');
    
    // Plugin hook: before quiz generation
    doAction('quiz:beforeGenerate', { step, courseTitle });

    try {
      const response = await apiPost('/generate-test', {
        step,
        courseTitle,
      });

      if (!response.ok) throw new Error('Failed to generate quiz');
      
      const data = await response.json();
      let generatedQuestions = data.questions || [];
      
      // Plugin hook: filter generated questions
      generatedQuestions = await applyFilters('quiz:afterGenerate', generatedQuestions, { step, courseTitle });
      
      setQuestions(generatedQuestions);
      setQuizGenerated(true);
      
      // Immediately save the generated questions to the course
      if (generatedQuestions.length > 0) {
        onComplete(-1, generatedQuestions.length, generatedQuestions); // -1 indicates just saving questions, not submitting
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      // Plugin hook: quiz generation failed
      doAction('quiz:generateFailed', { step, courseTitle, error });
    } finally {
      setLoading(false);
      onLoadingChange(false);
    }
  };

  const selectAnswer = (questionIndex: number, answerIndex: number) => {
    if (showResults || showingFeedback || selectedAnswers[questionIndex] !== undefined) return;
    
    const isCorrect = answerIndex === questions[questionIndex].correctAnswer;
    setSelectedAnswers(prev => ({ ...prev, [questionIndex]: answerIndex }));
    setLastAnswerCorrect(isCorrect);
    setShowingFeedback(true);
    
    // Plugin hook: answer selected
    doAction('quiz:answered', { 
      question: questions[questionIndex],
      selectedAnswer: answerIndex, 
      isCorrect,
      questionIndex
    });
    
    // Dispatch custom event for plugins that listen via DOM events
    document.dispatchEvent(new CustomEvent('gvidtech:quiz:answered', {
      detail: { question: questions[questionIndex], selectedAnswer: answerIndex, isCorrect, questionIndex }
    }));
    
    // Auto-advance after showing feedback
    feedbackTimeoutRef.current = setTimeout(() => {
      setShowingFeedback(false);
      setLastAnswerCorrect(null);
      
      // Check if this was the last question
      const newAnsweredCount = Object.keys(selectedAnswers).length + 1;
      if (newAnsweredCount >= questions.length) {
        // Auto-submit quiz
        let correct = 0;
        const newAnswers = { ...selectedAnswers, [questionIndex]: answerIndex };
        questions.forEach((q, index) => {
          if (newAnswers[index] === q.correctAnswer) {
            correct++;
          }
        });
        setScore(correct);
        setShowResults(true);
        onComplete(correct, questions.length, questions);
      } else if (questionIndex < questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
      }
    }, 800); // Show feedback for 800ms then advance
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  const submitQuiz = () => {
    let correct = 0;
    questions.forEach((q, index) => {
      if (selectedAnswers[index] === q.correctAnswer) {
        correct++;
      }
    });
    setScore(correct);
    setShowResults(true);
    // Save quiz results with questions for review
    onComplete(correct, questions.length, questions);
  };

  // Keyboard navigation - simplified for auto-advance mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showResults || questions.length === 0 || showingFeedback) return;
      
      // Don't allow answer selection if already answered
      if (selectedAnswers[currentQuestion] !== undefined) return;
      
      const currentQ = questions[currentQuestion];
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestion, showResults, questions, showingFeedback, selectedAnswers]);

  const retryQuiz = () => {
    setSelectedAnswers({});
    setCurrentQuestion(0);
    setShowResults(false);
    setScore(0);
  };

  if (loading) {
    return (
      <div className="quiz-page">
        <div className="quiz-loading">
          <p>Generating quiz questions...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="quiz-page">
        <div className="quiz-header">
          <button className="back-btn" onClick={onBack}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h1>Quiz: {step.title}</h1>
        </div>
        <div className="quiz-empty">
          <p>No quiz questions available.</p>
          <button className="btn btn-primary" onClick={loadQuiz}>Generate Quiz</button>
        </div>
      </div>
    );
  }

  if (showResults) {
    const percentage = Math.round((score / questions.length) * 100);
    // Use plugin filter for pass threshold
    const passThreshold = applyFiltersSync('quiz:passThreshold', 0.7);
    const passPercentage = Math.round(passThreshold * 100);
    const passed = percentage >= passPercentage;

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
            <span className="score-label">{score}/{questions.length} correct</span>
          </div>
          
          <h2>{passed ? '🎉 Congratulations!' : '📚 Keep Learning!'}</h2>
          <p>
            {passed 
              ? 'You passed the quiz! Great job understanding this material.'
              : `You need ${passPercentage}% to pass. Review the materials and try again.`}
          </p>

          <div className="results-breakdown">
            <h3>Question Review</h3>
            <div className="results-grid">
              {questions.map((q, index) => {
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
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back to Course
            </button>
          </div>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const answeredCount = Object.keys(selectedAnswers).length;
  const isCurrentAnswered = selectedAnswers[currentQuestion] !== undefined;
  const currentAnswerCorrect = isCurrentAnswered && selectedAnswers[currentQuestion] === question.correctAnswer;

  return (
    <div className="quiz-page">
      <div className="quiz-header">
        <button className="back-btn" onClick={onBack}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div className="quiz-header-info">
          <span className="course-breadcrumb">{courseTitle}</span>
          <h1>Quiz: {step.title}</h1>
        </div>
      </div>

      <div className="quiz-progress">
        <div className="progress-dots">
          {questions.map((q, index) => {
            const answered = selectedAnswers[index] !== undefined;
            const correct = answered && selectedAnswers[index] === q.correctAnswer;
            return (
              <div
                key={index}
                className={`progress-dot ${index === currentQuestion ? 'active' : ''} ${answered ? (correct ? 'correct' : 'incorrect') : ''}`}
              >
                {index + 1}
              </div>
            );
          })}
        </div>
        <span className="progress-text">{answeredCount}/{questions.length} answered</span>
      </div>

      <div className="quiz-content">
        <div className="question-card">
          <span className="question-number">Question {currentQuestion + 1} of {questions.length}</span>
          <h2 className="question-text"><LatexText>{question.question}</LatexText></h2>
          
          <div className="options-list">
            {question.options.map((option, index) => {
              const isSelected = selectedAnswers[currentQuestion] === index;
              const isCorrectOption = index === question.correctAnswer;
              const showCorrect = isCurrentAnswered && isCorrectOption;
              const showIncorrect = isCurrentAnswered && isSelected && !isCorrectOption;
              
              return (
                <button
                  key={index}
                  className={`option-btn ${isSelected ? 'selected' : ''} ${showCorrect ? 'correct' : ''} ${showIncorrect ? 'incorrect' : ''}`}
                  onClick={() => selectAnswer(currentQuestion, index)}
                  disabled={isCurrentAnswered}
                >
                  <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                  <span className="option-text"><LatexText>{option}</LatexText></span>
                  {showCorrect && (
                    <svg className="option-feedback" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                  {showIncorrect && (
                    <svg className="option-feedback" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {showingFeedback && (
            <div className={`quiz-feedback ${lastAnswerCorrect ? 'correct' : 'incorrect'}`}>
              {lastAnswerCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizPage;
