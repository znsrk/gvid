import React, { useState } from 'react';
import { Course, CourseStep, MatchingGame } from '../types/roadmap';
import LatexText from '../components/LatexText';
import { apiPost } from '../lib/fetch';

interface CourseViewProps {
  course: Course;
  onBack: () => void;
  onUpdateCourse: (course: Course) => void;
  onOpenMaterial: (step: CourseStep) => void;
  onLoadingChange: (loading: boolean, message?: string) => void;
  onGenerateFlashcards: (course: Course) => void;
  onGenerateMatchingGame?: (game: MatchingGame) => void;
}

const isStepUnlocked = (step: CourseStep, steps: CourseStep[]): boolean => {
  // First step is always unlocked
  if (step.stepNumber === 1) return true;
  
  // Check if explicitly unlocked
  if (step.unlocked) return true;
  
  // Find the previous step
  const prevStep = steps.find(s => s.stepNumber === step.stepNumber - 1);
  if (!prevStep) return true;
  
  // Previous step must have completed quiz with passing score (70%)
  if (prevStep.test?.completed && prevStep.test.score !== undefined) {
    const passingScore = prevStep.test.totalQuestions * 0.7;
    return prevStep.test.score >= passingScore;
  }
  
  return false;
};

const CourseView: React.FC<CourseViewProps> = ({ 
  course, 
  onBack, 
  onUpdateCourse, 
  onOpenMaterial, 
  onLoadingChange,
  onGenerateFlashcards,
  onGenerateMatchingGame
}) => {
  // Only expand first unlocked step by default
  const firstUnlockedStep = course.steps.find(s => isStepUnlocked(s, course.steps) && !s.completed);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set([firstUnlockedStep?.id || course.steps[0]?.id]));
  const [isGeneratingGame, setIsGeneratingGame] = useState(false);

  // Check if course is complete (all steps completed)
  const isCourseComplete = course.progress === 100;

  const handleGenerateMatchingGame = async () => {
    if (!onGenerateMatchingGame) return;
    
    setIsGeneratingGame(true);
    onLoadingChange(true, 'Creating matching game from course...');
    
    try {
      const response = await apiPost('/generate-course-matching-game', {
        courseTitle: course.title,
        courseDescription: course.description,
        steps: course.steps.map(s => ({
          title: s.title,
          description: s.description
        }))
      });

      if (!response.ok) throw new Error('Failed to generate matching game');
      
      const data = await response.json();
      
      const game: MatchingGame = {
        id: `game-${Date.now()}`,
        title: `${course.title} Match`,
        description: `Matching game from: ${course.title}`,
        pairs: data.pairs,
        createdAt: new Date().toISOString(),
        coverImage: course.coverImage || 'linear-gradient(135deg, #667eea 0%, #f093fb 100%)'
      };
      
      onGenerateMatchingGame(game);
    } catch (error) {
      console.error('Error generating matching game:', error);
    } finally {
      setIsGeneratingGame(false);
      onLoadingChange(false);
    }
  };

  const toggleStep = (stepId: string, step: CourseStep) => {
    // Only allow expanding unlocked steps
    if (!isStepUnlocked(step, course.steps)) return;
    
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const loadStepDetails = async (stepId: string) => {
    const step = course.steps.find(s => s.id === stepId);
    if (!step || step.detailsLoaded || step.detailsLoading) return;

    onLoadingChange(true, 'Loading course content...');

    try {
      const response = await apiPost('/generate-step-details', {
        step,
        courseTitle: course.title,
        courseDescription: course.description,
        originalPrompt: course.originalPrompt,
        originalMaterials: course.originalMaterials,
      });

      if (!response.ok) throw new Error('Failed to load content');
      
      const details = await response.json();
      
      const updatedSteps = course.steps.map(s => 
        s.id === stepId 
          ? { ...s, tasks: details.tasks, materials: details.materials, detailsLoaded: true }
          : s
      );
      
      onUpdateCourse({ ...course, steps: updatedSteps });
    } catch (error) {
      console.error('Error loading step details:', error);
    } finally {
      onLoadingChange(false);
    }
  };

  const handleOpenMaterial = async (step: CourseStep) => {
    if (!step.detailsLoaded) {
      await loadStepDetails(step.id);
      // Get updated step
      const updatedStep = course.steps.find(s => s.id === step.id);
      if (updatedStep?.detailsLoaded) {
        onOpenMaterial(updatedStep);
      }
    } else {
      onOpenMaterial(step);
    }
  };

  const completedSteps = course.steps.filter(s => s.completed).length;

  return (
    <div className="course-page">
      <div className="course-header">
        <div className="course-header-top">
          <button className="back-btn" onClick={onBack}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h1>{course.title}</h1>
        </div>
        
        <div className="course-header-meta">
          <div className="meta-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {new Date(course.createdAt).toLocaleDateString()}
          </div>
          <div className="meta-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            {course.totalSteps} steps
          </div>
        </div>

        <div className="progress-container">
          <div className="progress-label">
            <span>Progress</span>
            <span>{completedSteps} of {course.totalSteps} completed ({course.progress}%)</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${course.progress}%` }}/>
          </div>
        </div>

        <div className="course-actions">
          <button 
            className={`btn btn-secondary ${!isCourseComplete ? 'locked' : ''}`}
            onClick={() => isCourseComplete && onGenerateFlashcards(course)}
            disabled={!isCourseComplete}
            title={!isCourseComplete ? 'Complete all steps to unlock' : 'Generate flashcards from this course'}
          >
            {!isCourseComplete && (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            )}
            {isCourseComplete && (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M12 8v8"/>
                <path d="M8 12h8"/>
              </svg>
            )}
            Generate Flashcards
          </button>
          <button 
            className={`btn btn-secondary ${!isCourseComplete ? 'locked' : ''}`}
            onClick={() => isCourseComplete && handleGenerateMatchingGame()}
            disabled={!isCourseComplete || isGeneratingGame}
            title={!isCourseComplete ? 'Complete all steps to unlock' : 'Generate matching game from this course'}
          >
            {!isCourseComplete && (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            )}
            {isCourseComplete && (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="8" height="8" rx="1"/>
                <rect x="14" y="3" width="8" height="8" rx="1"/>
                <rect x="2" y="13" width="8" height="8" rx="1"/>
                <rect x="14" y="13" width="8" height="8" rx="1"/>
              </svg>
            )}
            {isGeneratingGame ? 'Generating...' : 'Generate Matching Game'}
          </button>
        </div>
      </div>

      <div className="course-content">
        <div className="steps-list">
          {course.steps.map((step) => {
            const stepUnlocked = isStepUnlocked(step, course.steps);
            const prevStep = course.steps.find(s => s.stepNumber === step.stepNumber - 1);
            const requiredScore = prevStep?.test?.totalQuestions ? Math.ceil(prevStep.test.totalQuestions * 0.7) : 0;
            
            return (
              <div key={step.id} className={`step-card ${step.completed ? 'completed' : ''} ${!stepUnlocked ? 'locked' : ''}`}>
                <div className="step-header" onClick={() => toggleStep(step.id, step)}>
                  <div className="step-number">
                    {!stepUnlocked ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    ) : step.completed ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : (
                      step.stepNumber
                    )}
                  </div>
                  <div className="step-info">
                    <div className="step-title">{step.title}</div>
                    <div className="step-meta">
                      {!stepUnlocked ? (
                        <span className="locked-hint">
                          Complete Step {step.stepNumber - 1} quiz with {requiredScore}+ correct to unlock
                        </span>
                      ) : (
                        step.estimatedTime
                      )}
                    </div>
                  </div>
                  {stepUnlocked && (
                    <svg 
                      className={`step-chevron ${expandedSteps.has(step.id) ? 'expanded' : ''}`}
                      xmlns="http://www.w3.org/2000/svg" 
                      width="20" 
                      height="20" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  )}
                </div>

                {stepUnlocked && expandedSteps.has(step.id) && (
                  <div className="step-content">
                    <p className="step-description"><LatexText>{step.description}</LatexText></p>
                    <div className="step-actions">
                      <button 
                        className="btn btn-primary" 
                        onClick={() => handleOpenMaterial(step)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                        {step.completed ? 'Review' : 'Begin'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CourseView;
