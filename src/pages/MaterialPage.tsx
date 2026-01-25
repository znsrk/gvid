import React, { useState } from 'react';
import { CourseStep, FlashcardDeck, Flashcard, MatchingGame } from '../types/roadmap';
import LatexText from '../components/LatexText';

interface MaterialPageProps {
  step: CourseStep;
  courseTitle: string;
  courseId: string;
  onBack: () => void;
  onStartQuiz: () => void;
  onMarkComplete: () => void;
  onUpdateMaterialProgress: (materialIndex: number) => void;
  onGenerateFlashcards?: (deck: FlashcardDeck) => void;
  onGenerateMatchingGame?: (game: MatchingGame) => void;
  onLoadingChange?: (loading: boolean, message?: string) => void;
}

const API_BASE = 'http://localhost:3001/api';

const MaterialPage: React.FC<MaterialPageProps> = ({ 
  step, 
  courseTitle, 
  courseId,
  onBack, 
  onStartQuiz,
  onMarkComplete,
  onUpdateMaterialProgress,
  onGenerateFlashcards,
  onGenerateMatchingGame,
  onLoadingChange
}) => {
  // Track current material being viewed (progressive learning)
  const [currentMaterialIndex, setCurrentMaterialIndex] = useState(step.materialProgress || 0);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [isGeneratingMatchingGame, setIsGeneratingMatchingGame] = useState(false);
  const totalMaterials = step.materials?.length || 0;
  const allMaterialsViewed = currentMaterialIndex >= totalMaterials - 1;
  
  const handleGenerateFlashcards = async () => {
    if (!step.materials || step.materials.length === 0) return;
    
    setIsGeneratingFlashcards(true);
    onLoadingChange?.(true, 'Generating flashcards from materials...');
    
    try {
      const response = await fetch(`${API_BASE}/generate-step-flashcards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepTitle: step.title,
          stepDescription: step.description,
          materials: step.materials
        }),
      });

      if (!response.ok) throw new Error('Failed to generate flashcards');
      
      const data = await response.json();
      
      const deck: FlashcardDeck = {
        id: `deck-${Date.now()}`,
        title: `${step.title} Flashcards`,
        description: `Flashcards from: ${courseTitle} - Step ${step.stepNumber}`,
        cards: data.flashcards,
        createdAt: new Date().toISOString(),
        sourceType: 'course',
        sourceCourseId: courseId,
        coverImage: 'linear-gradient(135deg, #0b4c8a 0%, #6366f1 100%)'
      };
      
      onGenerateFlashcards?.(deck);
    } catch (error) {
      console.error('Error generating flashcards:', error);
    } finally {
      setIsGeneratingFlashcards(false);
      onLoadingChange?.(false);
    }
  };
  
  const handleGenerateMatchingGame = async () => {
    if (!step.materials || step.materials.length === 0) return;
    
    setIsGeneratingMatchingGame(true);
    onLoadingChange?.(true, 'Creating matching game from materials...');
    
    try {
      const response = await fetch(`${API_BASE}/generate-step-matching-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepTitle: step.title,
          stepDescription: step.description,
          materials: step.materials
        }),
      });

      if (!response.ok) throw new Error('Failed to generate matching game');
      
      const data = await response.json();
      
      const game: MatchingGame = {
        id: `game-${Date.now()}`,
        title: `${step.title} Match`,
        description: `Matching game from: ${courseTitle} - Step ${step.stepNumber}`,
        pairs: data.pairs,
        createdAt: new Date().toISOString(),
        coverImage: 'linear-gradient(135deg, #667eea 0%, #f093fb 100%)'
      };
      
      onGenerateMatchingGame?.(game);
    } catch (error) {
      console.error('Error generating matching game:', error);
    } finally {
      setIsGeneratingMatchingGame(false);
      onLoadingChange?.(false);
    }
  };
  
  const handleNextMaterial = () => {
    if (currentMaterialIndex < totalMaterials - 1) {
      const newIndex = currentMaterialIndex + 1;
      setCurrentMaterialIndex(newIndex);
      onUpdateMaterialProgress(newIndex);
    }
  };
  
  const handlePrevMaterial = () => {
    if (currentMaterialIndex > 0) {
      setCurrentMaterialIndex(currentMaterialIndex - 1);
    }
  };
  
  const currentMaterial = step.materials?.[currentMaterialIndex];

  return (
    <div className="material-page">
      <div className="material-header">
        <button className="back-btn" onClick={onBack}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div className="material-header-info">
          <span className="course-breadcrumb">{courseTitle}</span>
          <h1>Step {step.stepNumber}: {step.title}</h1>
        </div>
      </div>

      <div className="material-content">
        <div className="material-section">
          <h2>Overview</h2>
          <p>{step.description}</p>
          <div className="material-meta">
            <span className="time-estimate">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              {step.estimatedTime}
            </span>
          </div>
        </div>

        {step.tasks && step.tasks.length > 0 && (
          <div className="material-section">
            <h2>Learning Tasks</h2>
            <div className="tasks-list">
              {step.tasks.map((task, index) => (
                <div key={task.id} className="task-item">
                  <div className="task-number">{index + 1}</div>
                  <div className="task-content">
                    <h3><LatexText>{task.title}</LatexText></h3>
                    <p><LatexText>{task.description}</LatexText></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {totalMaterials > 0 && currentMaterial && (
          <div className="material-section">
            <div className="material-progress-header">
              <h2>Learning Materials</h2>
              <span className="material-counter">
                {currentMaterialIndex + 1} of {totalMaterials}
              </span>
            </div>
            
            {/* Current material card */}
            <div className={`material-card current-material ${currentMaterial.type === 'video' ? 'video-material' : ''}`}>
              <div className={`material-type-badge ${currentMaterial.type === 'video' ? 'video-badge' : ''}`}>
                {currentMaterial.type === 'video' && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                )}
                {currentMaterial.type}
              </div>
              <h3><LatexText>{currentMaterial.title}</LatexText></h3>
              {currentMaterial.description && (
                <p className="material-description"><LatexText>{currentMaterial.description}</LatexText></p>
              )}
              {currentMaterial.youtubeSearch && (
                <div className="youtube-search-hint">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#FF0000">
                    <path d="M23.5 6.2c-.3-1-1-1.8-2-2.1C19.6 3.5 12 3.5 12 3.5s-7.6 0-9.5.6c-1 .3-1.7 1.1-2 2.1C0 8.1 0 12 0 12s0 3.9.5 5.8c.3 1 1 1.8 2 2.1 1.9.6 9.5.6 9.5.6s7.6 0 9.5-.6c1-.3 1.7-1.1 2-2.1.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.5 15.5v-7l6.3 3.5-6.3 3.5z"/>
                  </svg>
                  <span>Search: "{currentMaterial.youtubeSearch}"</span>
                </div>
              )}
              <div className="material-details">
                {currentMaterial.content && (
                  <div className="material-text-content">
                    <LatexText>{currentMaterial.content}</LatexText>
                  </div>
                )}
                {currentMaterial.url && (
                  <a 
                    href={currentMaterial.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={`material-link ${currentMaterial.type === 'video' ? 'youtube-link' : ''}`}
                  >
                    {currentMaterial.type === 'video' ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#FF0000">
                          <path d="M23.5 6.2c-.3-1-1-1.8-2-2.1C19.6 3.5 12 3.5 12 3.5s-7.6 0-9.5.6c-1 .3-1.7 1.1-2 2.1C0 8.1 0 12 0 12s0 3.9.5 5.8c.3 1 1 1.8 2 2.1 1.9.6 9.5.6 9.5.6s7.6 0 9.5-.6c1-.3 1.7-1.1 2-2.1.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.5 15.5v-7l6.3 3.5-6.3 3.5z"/>
                        </svg>
                        Search on YouTube
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                          <polyline points="15 3 21 3 21 9"/>
                          <line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                        Open Resource
                      </>
                    )}
                  </a>
                )}
              </div>
            </div>
            
            {/* Material navigation */}
            <div className="material-navigation">
              <button 
                className="btn btn-secondary" 
                onClick={handlePrevMaterial}
                disabled={currentMaterialIndex === 0}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Previous
              </button>
              
              <button 
                className="btn btn-outline"
                onClick={handleGenerateFlashcards}
                disabled={isGeneratingFlashcards}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="M12 8v8"/>
                  <path d="M8 12h8"/>
                </svg>
                {isGeneratingFlashcards ? 'Generating...' : 'Flashcards'}
              </button>
              
              <button 
                className="btn btn-outline"
                onClick={handleGenerateMatchingGame}
                disabled={isGeneratingMatchingGame}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="8" height="8" rx="1"/>
                  <rect x="14" y="3" width="8" height="8" rx="1"/>
                  <rect x="2" y="13" width="8" height="8" rx="1"/>
                  <rect x="14" y="13" width="8" height="8" rx="1"/>
                </svg>
                {isGeneratingMatchingGame ? 'Creating...' : 'Match Game'}
              </button>
              
              {currentMaterialIndex < totalMaterials - 1 ? (
                <button className="btn btn-primary" onClick={handleNextMaterial}>
                  Next Material
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              ) : (
                <button className="btn btn-primary" onClick={onStartQuiz}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  Take Quiz to Complete
                </button>
              )}
            </div>
          </div>
        )}

        {totalMaterials === 0 && (
          <div className="material-actions">
            <button className="btn btn-secondary" onClick={onStartQuiz}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              Take Quiz
            </button>
            {!step.completed && (
              <button className="btn btn-primary" onClick={onMarkComplete}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Mark as Complete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MaterialPage;
