import React, { useState, useEffect } from 'react';
import './styles/global.css';
import Sidebar from './components/Sidebar';
import LoadingOverlay from './components/LoadingOverlay';
import PromptPage from './pages/PromptPage';
import CourseGallery from './pages/CourseGallery';
import CourseView from './pages/CourseView';
import MaterialPage from './pages/MaterialPage';
import QuizPage from './pages/QuizPage';
import FlashcardsPage from './pages/FlashcardsPage';
import StandaloneQuizPage from './pages/StandaloneQuizPage';
import MatchingGamePage from './pages/MatchingGamePage';
import PluginManagerPage from './pages/PluginManagerPage';
import { Course, CourseStep, QuizQuestion, FlashcardDeck, StandaloneQuiz, MatchingGame } from './types/roadmap';
import { usePlugins, doAction, applyFilters } from './plugins';

type Page = 'prompt' | 'gallery' | 'view' | 'material' | 'quiz' | 'flashcards' | 'standalone-quiz' | 'matching-game' | 'plugins';

const API_BASE = 'http://localhost:3001/api';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('prompt');
  const [courses, setCourses] = useState<Course[]>([]);
  const [flashcardDecks, setFlashcardDecks] = useState<FlashcardDeck[]>([]);
  const [standaloneQuizzes, setStandaloneQuizzes] = useState<StandaloneQuiz[]>([]);
  const [matchingGames, setMatchingGames] = useState<MatchingGame[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedStep, setSelectedStep] = useState<CourseStep | null>(null);
  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<StandaloneQuiz | null>(null);
  const [selectedMatchingGame, setSelectedMatchingGame] = useState<MatchingGame | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Load all data from server on mount
  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/roadmaps`).then(res => res.json()).catch(() => []),
      fetch(`${API_BASE}/flashcard-decks`).then(res => res.json()).catch(() => []),
      fetch(`${API_BASE}/standalone-quizzes`).then(res => res.json()).catch(() => []),
      fetch(`${API_BASE}/matching-games`).then(res => res.json()).catch(() => [])
    ]).then(([coursesData, flashcardsData, quizzesData, matchingData]) => {
      setCourses(coursesData);
      setFlashcardDecks(flashcardsData);
      setStandaloneQuizzes(quizzesData);
      setMatchingGames(matchingData);
      setInitialLoading(false);
    }).catch(err => {
      console.error('Failed to load data:', err);
      setInitialLoading(false);
    });
  }, []);

  const handleLoadingChange = (loading: boolean, message?: string) => {
    setIsLoading(loading);
    setLoadingMessage(message || 'Generating...');
  };

  const handleNavigation = (page: 'prompt' | 'gallery' | 'plugins') => {
    const previousPage = currentPage;
    setCurrentPage(page);
    setSelectedCourse(null);
    setSelectedStep(null);
    setSelectedDeck(null);
    setSelectedQuiz(null);
    setSelectedMatchingGame(null);
    
    // Plugin hook: navigation event
    doAction('app:navigate', page, previousPage);
  };

  const handleCourseGenerated = async (course: Course) => {
    // Plugin hook: filter course before save
    const filteredCourse = await applyFilters('course:beforeSave', course);
    
    try {
      await fetch(`${API_BASE}/roadmaps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filteredCourse),
      });
    } catch (err) {
      console.error('Failed to save course:', err);
    }
    
    setCourses((prev) => [filteredCourse, ...prev]);
    setSelectedCourse(filteredCourse);
    setCurrentPage('view');
    
    // Plugin hook: course created action
    doAction('course:created', filteredCourse);
  };

  const handleFlashcardsGenerated = async (deck: FlashcardDeck) => {
    try {
      await fetch(`${API_BASE}/flashcard-decks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deck),
      });
    } catch (err) {
      console.error('Failed to save flashcard deck:', err);
    }
    setFlashcardDecks((prev) => [deck, ...prev]);
    setSelectedDeck(deck);
    setCurrentPage('flashcards');
    
    // Plugin hook: flashcard deck created
    doAction('flashcards:deckCreated', deck);
  };

  const handleQuizGenerated = async (quiz: StandaloneQuiz) => {
    try {
      await fetch(`${API_BASE}/standalone-quizzes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quiz),
      });
    } catch (err) {
      console.error('Failed to save quiz:', err);
    }
    setStandaloneQuizzes((prev) => [quiz, ...prev]);
    setSelectedQuiz(quiz);
    setCurrentPage('standalone-quiz');
    
    // Plugin hook: quiz created
    doAction('quiz:created', quiz);
  };

  const handleMatchingGameGenerated = async (game: MatchingGame) => {
    try {
      await fetch(`${API_BASE}/matching-games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(game),
      });
    } catch (err) {
      console.error('Failed to save matching game:', err);
    }
    setMatchingGames((prev) => [game, ...prev]);
    setSelectedMatchingGame(game);
    setCurrentPage('matching-game');
    
    // Plugin hook: matching game created
    doAction('matching:gameCreated', game);
  };

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    
    // Plugin hook: course opened
    doAction('course:opened', course);
    setCurrentPage('view');
  };

  const handleBackToGallery = () => {
    setSelectedCourse(null);
    setSelectedStep(null);
    setSelectedDeck(null);
    setSelectedQuiz(null);
    setSelectedMatchingGame(null);
    setCurrentPage('gallery');
  };

  const handleBackToCourse = () => {
    // Update selected step from the latest course state
    if (selectedCourse && selectedStep) {
      const updatedStep = selectedCourse.steps.find(s => s.id === selectedStep.id);
      if (updatedStep) {
        setSelectedStep(updatedStep);
      }
    }
    setSelectedStep(null);
    setCurrentPage('view');
  };

  const handleUpdateCourse = async (updatedCourse: Course) => {
    try {
      await fetch(`${API_BASE}/roadmaps/${updatedCourse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCourse),
      });
    } catch (err) {
      console.error('Failed to update course:', err);
    }
    
    setCourses((prev) =>
      prev.map((c) => (c.id === updatedCourse.id ? updatedCourse : c))
    );
    setSelectedCourse(updatedCourse);
  };

  const handleOpenMaterial = (step: CourseStep) => {
    setSelectedStep(step);
    setCurrentPage('material');
  };

  const handleStartQuiz = (step: CourseStep) => {
    setSelectedStep(step);
    setCurrentPage('quiz');
  };

  const handleMarkComplete = () => {
    if (!selectedCourse || !selectedStep) return;
    
    const updatedSteps = selectedCourse.steps.map(s => 
      s.id === selectedStep.id ? { ...s, completed: true } : s
    );
    const completedCount = updatedSteps.filter(s => s.completed).length;
    const progress = Math.round((completedCount / updatedSteps.length) * 100);
    
    const updatedCourse = { ...selectedCourse, steps: updatedSteps, progress };
    handleUpdateCourse(updatedCourse);
    setSelectedStep({ ...selectedStep, completed: true });
  };

  const handleQuizComplete = async (score: number, total: number, questions: QuizQuestion[]) => {
    if (!selectedCourse || !selectedStep) return;
    
    // If score is -1, this is just saving questions after generation (not a submission)
    const isJustSavingQuestions = score === -1;
    
    // Plugin hook: filter quiz pass threshold (default 0.7 = 70%)
    let passThreshold = 0.7;
    if (!isJustSavingQuestions) {
      passThreshold = await applyFilters('quiz:passThreshold', 0.7);
    }
    
    // Plugin hook: filter quiz score calculation
    let passed = !isJustSavingQuestions && (score / total >= passThreshold);
    if (!isJustSavingQuestions) {
      const scoreResult = await applyFilters('quiz:calculateScore', { score, total, passed, questions });
      passed = scoreResult.passed;
    }
    
    // Find next step to potentially unlock
    const currentStepIndex = selectedCourse.steps.findIndex(s => s.id === selectedStep.id);
    const nextStep = selectedCourse.steps[currentStepIndex + 1];
    
    const updatedSteps = selectedCourse.steps.map((s, index) => {
      if (s.id === selectedStep.id) {
        return { 
          ...s, 
          test: { 
            id: `test-${s.id}`,
            questions: questions,
            completed: isJustSavingQuestions ? (s.test?.completed || false) : true, 
            score: isJustSavingQuestions ? (s.test?.score) : score, 
            totalQuestions: total 
          },
          completed: isJustSavingQuestions ? s.completed : passed
        };
      }
      // Unlock next step if quiz passed
      if (nextStep && s.id === nextStep.id && passed) {
        return { ...s, unlocked: true };
      }
      return s;
    });
    
    const completedCount = updatedSteps.filter(s => s.completed).length;
    const progress = Math.round((completedCount / updatedSteps.length) * 100);
    
    const updatedCourse = { ...selectedCourse, steps: updatedSteps, progress };
    handleUpdateCourse(updatedCourse);
    
    // Update selected step with the new test data
    const updatedStep = updatedSteps.find(s => s.id === selectedStep.id);
    if (updatedStep) {
      setSelectedStep(updatedStep);
    }
    
    // Plugin hook: quiz completed action
    if (!isJustSavingQuestions) {
      doAction('quiz:completed', { course: updatedCourse, step: updatedStep, score, total, passed, questions });
      
      // Dispatch custom event for plugins that listen via DOM events
      document.dispatchEvent(new CustomEvent('oqyplus:quiz:completed', {
        detail: { course: updatedCourse, step: updatedStep, score, total, passed, questions }
      }));
    }
  };

  const handleUpdateMaterialProgress = (materialIndex: number) => {
    if (!selectedCourse || !selectedStep) return;
    
    const updatedSteps = selectedCourse.steps.map(s => 
      s.id === selectedStep.id ? { ...s, materialProgress: materialIndex } : s
    );
    
    const updatedCourse = { ...selectedCourse, steps: updatedSteps };
    handleUpdateCourse(updatedCourse);
    setSelectedStep({ ...selectedStep, materialProgress: materialIndex });
    
    // Plugin hook: material progress updated
    doAction('material:progressUpdated', { course: updatedCourse, step: selectedStep, materialIndex });
  };

  const handleGenerateCourseFlashcards = async (course: Course) => {
    handleLoadingChange(true, 'Generating flashcards from course...');
    
    // Plugin hook: before generating course flashcards
    doAction('flashcards:beforeGenerate', course);
    
    try {
      const response = await fetch(`${API_BASE}/generate-course-flashcards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseTitle: course.title,
          courseDescription: course.description,
          steps: course.steps.map(s => ({
            title: s.title,
            description: s.description
          }))
        }),
      });

      if (!response.ok) throw new Error('Failed to generate flashcards');
      
      const data = await response.json();
      let newDeck: FlashcardDeck = {
        id: `deck-${Date.now()}`,
        title: `${course.title} Flashcards`,
        description: `Generated flashcards from course: ${course.title}`,
        cards: data.flashcards,
        createdAt: new Date().toISOString(),
        sourceType: 'course',
        sourceCourseId: course.id
      };
      
      // Plugin hook: filter flashcard deck after generation
      newDeck = await applyFilters('flashcards:afterGenerate', newDeck, course);
      
      setFlashcardDecks(prev => [newDeck, ...prev]);
      setSelectedDeck(newDeck);
      setCurrentPage('flashcards');
      
      // Plugin hook: flashcard deck created
      doAction('flashcards:deckCreated', newDeck);
    } catch (error) {
      console.error('Error generating course flashcards:', error);
      // Plugin hook: flashcard generation failed
      doAction('flashcards:generateFailed', { course, error });
    } finally {
      handleLoadingChange(false);
    }
  };

  const renderContent = () => {
    if (initialLoading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <div className="loading-dots">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        </div>
      );
    }

    if (currentPage === 'quiz' && selectedCourse && selectedStep) {
      return (
        <QuizPage
          step={selectedStep}
          courseTitle={selectedCourse.title}
          onBack={handleBackToCourse}
          onComplete={handleQuizComplete}
          onLoadingChange={handleLoadingChange}
        />
      );
    }

    if (currentPage === 'material' && selectedCourse && selectedStep) {
      return (
        <MaterialPage
          step={selectedStep}
          courseTitle={selectedCourse.title}
          courseId={selectedCourse.id}
          onBack={handleBackToCourse}
          onStartQuiz={() => handleStartQuiz(selectedStep)}
          onMarkComplete={handleMarkComplete}
          onUpdateMaterialProgress={handleUpdateMaterialProgress}
          onGenerateFlashcards={(deck) => {
            setFlashcardDecks(prev => [deck, ...prev]);
            setSelectedDeck(deck);
            setCurrentPage('flashcards');
          }}
          onGenerateMatchingGame={handleMatchingGameGenerated}
          onLoadingChange={handleLoadingChange}
        />
      );
    }

    if (currentPage === 'view' && selectedCourse) {
      return (
        <CourseView
          course={selectedCourse}
          onBack={handleBackToGallery}
          onUpdateCourse={handleUpdateCourse}
          onOpenMaterial={handleOpenMaterial}
          onLoadingChange={handleLoadingChange}
          onGenerateFlashcards={handleGenerateCourseFlashcards}
          onGenerateMatchingGame={handleMatchingGameGenerated}
        />
      );
    }

    if (currentPage === 'flashcards' && selectedDeck) {
      // Determine back navigation based on source
      const handleFlashcardsBack = () => {
        if (selectedDeck.sourceType === 'course' && selectedDeck.sourceCourseId) {
          // Find the source course and go back to it
          const sourceCourse = courses.find(c => c.id === selectedDeck.sourceCourseId);
          if (sourceCourse) {
            setSelectedCourse(sourceCourse);
            setSelectedDeck(null);
            setCurrentPage('view');
            return;
          }
        }
        handleBackToGallery();
      };

      return (
        <FlashcardsPage
          deck={selectedDeck}
          onBack={handleFlashcardsBack}
          onUpdateDeck={(updatedDeck) => {
            setFlashcardDecks(prev => prev.map(d => d.id === updatedDeck.id ? updatedDeck : d));
            setSelectedDeck(updatedDeck);
          }}
        />
      );
    }

    if (currentPage === 'standalone-quiz' && selectedQuiz) {
      return (
        <StandaloneQuizPage
          quiz={selectedQuiz}
          onBack={handleBackToGallery}
          onComplete={(score: number, total: number) => {
            console.log(`Quiz completed: ${score}/${total}`);
          }}
        />
      );
    }

    if (currentPage === 'matching-game' && selectedMatchingGame) {
      return (
        <MatchingGamePage
          game={selectedMatchingGame}
          onBack={handleBackToGallery}
          onUpdateGame={async (updatedGame) => {
            try {
              await fetch(`${API_BASE}/matching-games/${updatedGame.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedGame),
              });
            } catch (err) {
              console.error('Failed to update matching game:', err);
            }
            setMatchingGames(prev => prev.map(g => g.id === updatedGame.id ? updatedGame : g));
            setSelectedMatchingGame(updatedGame);
          }}
        />
      );
    }

    if (currentPage === 'gallery') {
      return (
        <CourseGallery
          courses={courses}
          flashcardDecks={flashcardDecks}
          standaloneQuizzes={standaloneQuizzes}
          matchingGames={matchingGames}
          onSelectCourse={handleSelectCourse}
          onSelectDeck={(deck) => { setSelectedDeck(deck); setCurrentPage('flashcards'); }}
          onSelectQuiz={(quiz) => { setSelectedQuiz(quiz); setCurrentPage('standalone-quiz'); }}
          onSelectMatchingGame={(game) => { setSelectedMatchingGame(game); setCurrentPage('matching-game'); }}
          onNavigateToPrompt={() => setCurrentPage('prompt')}
        />
      );
    }

    if (currentPage === 'plugins') {
      return (
        <PluginManagerPage
          onBack={handleBackToGallery}
        />
      );
    }

    return (
      <PromptPage 
        onCourseGenerated={handleCourseGenerated}
        onFlashcardsGenerated={handleFlashcardsGenerated}
        onQuizGenerated={handleQuizGenerated}
        onMatchingGameGenerated={handleMatchingGameGenerated}
        onLoadingChange={handleLoadingChange}
      />
    );
  };

  const recentCourses = courses.slice(0, 5);

  return (
    <div className="app-container">
      <LoadingOverlay isVisible={isLoading} message={loadingMessage} />
      <Sidebar
        currentPage={currentPage === 'view' || currentPage === 'material' || currentPage === 'quiz' || currentPage === 'flashcards' || currentPage === 'standalone-quiz' || currentPage === 'matching-game' ? 'gallery' : currentPage === 'plugins' ? 'plugins' : currentPage}
        onNavigate={handleNavigation}
        recentCourses={recentCourses}
        onSelectCourse={handleSelectCourse}
      />
      <main className="main-content">{renderContent()}</main>
    </div>
  );
};

export default App;
