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
import WordScramblePage from './pages/WordScramblePage';
import FillBlankPage from './pages/FillBlankPage';
import ProfilePage from './pages/ProfilePage';
import CommunityPage from './pages/CommunityPage';
import PluginManagerPage from './pages/PluginManagerPage';
import AuthPage from './pages/AuthPage';
import { useAuth } from './contexts/AuthContext';
import { Course, CourseStep, QuizQuestion, FlashcardDeck, StandaloneQuiz, MatchingGame, WordScrambleGame, FillBlankGame } from './types/roadmap';
import { usePlugins, doAction, applyFilters } from './plugins';
import { apiFetch, apiPost, apiPut, apiDelete } from './lib/fetch';

type Page = 'prompt' | 'gallery' | 'view' | 'material' | 'quiz' | 'flashcards' | 'standalone-quiz' | 'matching-game' | 'word-scramble' | 'fill-blank' | 'plugins' | 'profile' | 'community';

const App: React.FC = () => {
  const { user, loading: authLoading, signOut, isRecovery } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('prompt');
  const [courses, setCourses] = useState<Course[]>([]);
  const [flashcardDecks, setFlashcardDecks] = useState<FlashcardDeck[]>([]);
  const [standaloneQuizzes, setStandaloneQuizzes] = useState<StandaloneQuiz[]>([]);
  const [matchingGames, setMatchingGames] = useState<MatchingGame[]>([]);
  const [wordScrambleGames, setWordScrambleGames] = useState<WordScrambleGame[]>([]);
  const [fillBlankGames, setFillBlankGames] = useState<FillBlankGame[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedStep, setSelectedStep] = useState<CourseStep | null>(null);
  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<StandaloneQuiz | null>(null);
  const [selectedMatchingGame, setSelectedMatchingGame] = useState<MatchingGame | null>(null);
  const [selectedWordScramble, setSelectedWordScramble] = useState<WordScrambleGame | null>(null);
  const [selectedFillBlank, setSelectedFillBlank] = useState<FillBlankGame | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const loadAllData = () => {
    if (!user) return;
    Promise.all([
      apiFetch('/roadmaps').then(res => res.json()).catch(() => []),
      apiFetch('/flashcard-decks').then(res => res.json()).catch(() => []),
      apiFetch('/standalone-quizzes').then(res => res.json()).catch(() => []),
      apiFetch('/matching-games').then(res => res.json()).catch(() => []),
      apiFetch('/word-scramble-games').then(res => res.json()).catch(() => []),
      apiFetch('/fill-blank-games').then(res => res.json()).catch(() => [])
    ]).then(([coursesData, flashcardsData, quizzesData, matchingData, scrambleData, fillBlankData]) => {
      setCourses(coursesData);
      setFlashcardDecks(flashcardsData);
      setStandaloneQuizzes(quizzesData);
      setMatchingGames(matchingData);
      setWordScrambleGames(scrambleData);
      setFillBlankGames(fillBlankData);
      setInitialLoading(false);
    }).catch(err => {
      console.error('Failed to load data:', err);
      setInitialLoading(false);
    });
  };

  // Load all data from server on mount (only when authenticated)
  useEffect(() => {
    loadAllData();
  }, [user]);

  const handleLoadingChange = (loading: boolean, message?: string) => {
    setIsLoading(loading);
    setLoadingMessage(message || 'Generating...');
  };

  const handleNavigation = (page: 'prompt' | 'gallery' | 'plugins' | 'profile' | 'community') => {
    const previousPage = currentPage;
    setCurrentPage(page);
    setSelectedCourse(null);
    setSelectedStep(null);
    setSelectedDeck(null);
    setSelectedQuiz(null);
    setSelectedMatchingGame(null);
    setSelectedWordScramble(null);
    setSelectedFillBlank(null);
    
    // Plugin hook: navigation event
    doAction('app:navigate', page, previousPage);
  };

  const handleCourseGenerated = async (course: Course) => {
    // Plugin hook: filter course before save
    const filteredCourse = await applyFilters('course:beforeSave', course);
    
    try {
      await apiPost('/roadmaps', filteredCourse);
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
      await apiPost('/flashcard-decks', deck);
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
      await apiPost('/standalone-quizzes', quiz);
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
      await apiPost('/matching-games', game);
    } catch (err) {
      console.error('Failed to save matching game:', err);
    }
    setMatchingGames((prev) => [game, ...prev]);
    setSelectedMatchingGame(game);
    setCurrentPage('matching-game');
    
    // Plugin hook: matching game created
    doAction('matching:gameCreated', game);
  };

  const handleWordScrambleGenerated = async (game: WordScrambleGame) => {
    try {
      await apiPost('/word-scramble-games', game);
    } catch (err) {
      console.error('Failed to save word scramble:', err);
    }
    setWordScrambleGames((prev) => [game, ...prev]);
    setSelectedWordScramble(game);
    setCurrentPage('word-scramble');
  };

  const handleFillBlankGenerated = async (game: FillBlankGame) => {
    try {
      await apiPost('/fill-blank-games', game);
    } catch (err) {
      console.error('Failed to save fill-blank game:', err);
    }
    setFillBlankGames((prev) => [game, ...prev]);
    setSelectedFillBlank(game);
    setCurrentPage('fill-blank');
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
      await apiPut(`/roadmaps/${updatedCourse.id}`, updatedCourse);
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
      document.dispatchEvent(new CustomEvent('gvidtech:quiz:completed', {
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
      const response = await apiPost('/generate-course-flashcards', {
        courseTitle: course.title,
        courseDescription: course.description,
        steps: course.steps.map(s => ({
          title: s.title,
          description: s.description
        }))
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
          onUpdateDeck={async (updatedDeck) => {
            try {
              await apiPut(`/flashcard-decks/${updatedDeck.id}`, updatedDeck);
            } catch (err) {
              console.error('Failed to update flashcard deck:', err);
            }
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
          onComplete={async (score: number, total: number) => {
            try {
              await apiPut(`/standalone-quizzes/${selectedQuiz.id}`, {
                ...selectedQuiz,
                completed: true,
                score,
                totalQuestions: total,
                bestScore: Math.max(score, selectedQuiz.bestScore || 0),
                timesTaken: (selectedQuiz.timesTaken || 0) + 1,
              });
              setStandaloneQuizzes(prev => prev.map(q => q.id === selectedQuiz.id ? {
                ...q, completed: true, score, totalQuestions: total,
                bestScore: Math.max(score, q.bestScore || 0),
                timesTaken: (q.timesTaken || 0) + 1,
              } : q));
            } catch (err) {
              console.error('Failed to save quiz results:', err);
            }
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
              await apiPut(`/matching-games/${updatedGame.id}`, updatedGame);
            } catch (err) {
              console.error('Failed to update matching game:', err);
            }
            setMatchingGames(prev => prev.map(g => g.id === updatedGame.id ? updatedGame : g));
            setSelectedMatchingGame(updatedGame);
          }}
        />
      );
    }

    if (currentPage === 'word-scramble' && selectedWordScramble) {
      return (
        <WordScramblePage
          game={selectedWordScramble}
          onBack={handleBackToGallery}
          onUpdateGame={async (updatedGame) => {
            try {
              await apiPut(`/word-scramble-games/${updatedGame.id}`, updatedGame);
            } catch (err) {
              console.error('Failed to update word scramble:', err);
            }
            setWordScrambleGames(prev => prev.map(g => g.id === updatedGame.id ? updatedGame : g));
            setSelectedWordScramble(updatedGame);
          }}
        />
      );
    }

    if (currentPage === 'fill-blank' && selectedFillBlank) {
      return (
        <FillBlankPage
          game={selectedFillBlank}
          onBack={handleBackToGallery}
          onUpdateGame={async (updatedGame) => {
            try {
              await apiPut(`/fill-blank-games/${updatedGame.id}`, updatedGame);
            } catch (err) {
              console.error('Failed to update fill-blank game:', err);
            }
            setFillBlankGames(prev => prev.map(g => g.id === updatedGame.id ? updatedGame : g));
            setSelectedFillBlank(updatedGame);
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
          wordScrambleGames={wordScrambleGames}
          fillBlankGames={fillBlankGames}
          onSelectCourse={handleSelectCourse}
          onSelectDeck={(deck) => { setSelectedDeck(deck); setCurrentPage('flashcards'); }}
          onSelectQuiz={(quiz) => { setSelectedQuiz(quiz); setCurrentPage('standalone-quiz'); }}
          onSelectMatchingGame={(game) => { setSelectedMatchingGame(game); setCurrentPage('matching-game'); }}
          onSelectWordScramble={(game) => { setSelectedWordScramble(game); setCurrentPage('word-scramble'); }}
          onSelectFillBlank={(game) => { setSelectedFillBlank(game); setCurrentPage('fill-blank'); }}
          onNavigateToPrompt={() => setCurrentPage('prompt')}
          onRefresh={loadAllData}
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

    if (currentPage === 'profile') {
      return (
        <ProfilePage
          onBack={handleBackToGallery}
          userEmail={user?.email}
        />
      );
    }

    if (currentPage === 'community') {
      return (
        <CommunityPage
          onBack={handleBackToGallery}
          onImport={() => {
            // Reload data after importing community content
            loadAllData();
          }}
        />
      );
    }

    return (
      <PromptPage 
        onCourseGenerated={handleCourseGenerated}
        onFlashcardsGenerated={handleFlashcardsGenerated}
        onQuizGenerated={handleQuizGenerated}
        onMatchingGameGenerated={handleMatchingGameGenerated}
        onWordScrambleGenerated={handleWordScrambleGenerated}
        onFillBlankGenerated={handleFillBlankGenerated}
        onLoadingChange={handleLoadingChange}
      />
    );
  };

  const recentCourses = courses.slice(0, 5);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
        <div className="loading-dots">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
      </div>
    );
  }

  // Show auth page if not logged in or in password recovery mode
  if (!user || isRecovery) {
    return <AuthPage />;
  }

  const sidebarCurrentPage = currentPage === 'view' || currentPage === 'material' || currentPage === 'quiz' || currentPage === 'flashcards' || currentPage === 'standalone-quiz' || currentPage === 'matching-game' || currentPage === 'word-scramble' || currentPage === 'fill-blank' ? 'gallery' : currentPage === 'plugins' ? 'plugins' : currentPage === 'profile' ? 'profile' : currentPage === 'community' ? 'community' : currentPage;

  return (
    <div className="app-container">
      <LoadingOverlay isVisible={isLoading} message={loadingMessage} />
      
      {/* Mobile top navigation bar */}
      <div className="mobile-top-nav">
        <button className="mobile-logo">
          <svg className="sidebar-logo-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M22 10l-10-5L2 10l10 5 10-5z"/>
            <path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5"/>
            <path d="M22 10v6"/>
            <circle cx="22" cy="18" r="2"/>
          </svg>
        </button>
        <div className="mobile-nav-buttons">
          <button 
            className={`mobile-nav-btn ${sidebarCurrentPage === 'prompt' ? 'active' : ''}`}
            onClick={() => handleNavigation('prompt')}
            title="Generate"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </button>
          <button 
            className={`mobile-nav-btn ${sidebarCurrentPage === 'gallery' ? 'active' : ''}`}
            onClick={() => handleNavigation('gallery')}
            title="Library"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
          </button>
          <button 
            className={`mobile-nav-btn ${sidebarCurrentPage === 'plugins' ? 'active' : ''}`}
            onClick={() => handleNavigation('plugins')}
            title="Plugins"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </button>
          <button 
            className={`mobile-nav-btn ${sidebarCurrentPage === 'profile' ? 'active' : ''}`}
            onClick={() => handleNavigation('profile')}
            title="Profile"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </button>
          <button 
            className={`mobile-nav-btn ${sidebarCurrentPage === 'community' ? 'active' : ''}`}
            onClick={() => handleNavigation('community')}
            title="Community"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </button>
        </div>
      </div>
      
      <Sidebar
        currentPage={sidebarCurrentPage}
        onNavigate={handleNavigation}
        recentCourses={recentCourses}
        onSelectCourse={handleSelectCourse}
        userEmail={user.email}
        onSignOut={signOut}
      />
      <main className="main-content">{renderContent()}</main>
    </div>
  );
};

export default App;
