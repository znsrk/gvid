import React, { useState, useEffect, useRef } from 'react';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  subMessage?: string;
}

const LOADING_STEPS = [
  { text: 'Analyzing your request...', duration: 2000 },
  { text: 'Generating content structure...', duration: 3000 },
  { text: 'Creating detailed materials...', duration: 4000 },
  { text: 'Optimizing for learning...', duration: 3000 },
  { text: 'Finalizing your content...', duration: 2000 },
];

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  isVisible,
  message = 'Generating...', 
  subMessage = 'This may take a moment' 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const wasVisibleRef = useRef(false);

  useEffect(() => {
    // When loading completes, rapidly cycle through remaining steps
    if (!isVisible && wasVisibleRef.current) {
      setIsClosing(true);
      
      // Rapidly complete all steps
      const rapidComplete = async () => {
        for (let i = currentStep; i < LOADING_STEPS.length; i++) {
          setCurrentStep(i);
          setStepProgress(0);
          await new Promise(resolve => setTimeout(resolve, 150));
          setStepProgress(100);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        // Small delay before hiding
        await new Promise(resolve => setTimeout(resolve, 300));
        setIsClosing(false);
        setCurrentStep(0);
        setStepProgress(0);
      };
      
      rapidComplete();
    }
    
    wasVisibleRef.current = isVisible;
  }, [isVisible, currentStep]);

  useEffect(() => {
    if (!isVisible || isClosing) return;

    let stepIndex = 0;
    let progressInterval: ReturnType<typeof setInterval>;
    
    // Progress animation within each step
    progressInterval = setInterval(() => {
      setStepProgress(prev => {
        if (prev >= 100) return 100;
        return prev + 2;
      });
    }, LOADING_STEPS[stepIndex]?.duration / 50 || 60);

    // Step advancement - cycle through steps, repeat last one if still loading
    const advanceStep = () => {
      stepIndex++;
      if (stepIndex >= LOADING_STEPS.length) {
        stepIndex = LOADING_STEPS.length - 1; // Stay on last step
      }
      setCurrentStep(stepIndex);
      setStepProgress(0);
    };

    const stepTimers = LOADING_STEPS.map((step, index) => {
      const totalDelay = LOADING_STEPS.slice(0, index + 1).reduce((acc, s) => acc + s.duration, 0);
      return setTimeout(advanceStep, totalDelay);
    });

    // If still loading after all steps, cycle last step animation
    const totalDuration = LOADING_STEPS.reduce((acc, s) => acc + s.duration, 0);
    const lastStepDuration = LOADING_STEPS[LOADING_STEPS.length - 1].duration;
    
    const cycleLastStep = setInterval(() => {
      setStepProgress(0);
    }, lastStepDuration);
    
    const startCycling = setTimeout(() => {
      // Start cycling only after all steps complete
    }, totalDuration);

    return () => {
      clearInterval(progressInterval);
      clearInterval(cycleLastStep);
      clearTimeout(startCycling);
      stepTimers.forEach(timer => clearTimeout(timer));
    };
  }, [isVisible, isClosing]);

  const shouldShow = isVisible || isClosing;

  return (
    <div className={`loading-overlay ${shouldShow ? 'visible' : ''}`}>
      <div className="loading-content">
        <div className="loading-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        
        <div className="loading-text">{message}</div>
        
        <div className="loading-steps">
          {LOADING_STEPS.map((step, index) => (
            <div 
              key={index} 
              className={`loading-step ${index < currentStep ? 'completed' : ''} ${index === currentStep ? 'active' : ''}`}
            >
              <div className="step-indicator">
                {index < currentStep ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span className="step-text">{step.text}</span>
              {index === currentStep && (
                <div className="step-progress">
                  <div className="step-progress-bar" style={{ width: `${stepProgress}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="loading-subtext">{subMessage}</div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
