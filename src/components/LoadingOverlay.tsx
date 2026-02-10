import React, { useState, useEffect, useRef } from 'react';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  subMessage?: string;
}

const LOADING_TIPS = [
  'Analyzing your request...',
  'Generating content structure...',
  'Creating detailed materials...',
  'Optimizing for learning...',
  'Finalizing your content...',
];

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  isVisible,
  message = 'Generating...', 
  subMessage = 'This may take a moment' 
}) => {
  const [progress, setProgress] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const wasVisibleRef = useRef(false);
  const progressRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isVisible && !wasVisibleRef.current) {
      // Starting fresh
      setProgress(0);
      progressRef.current = 0;
      setTipIndex(0);
      setIsClosing(false);
      
      // Slowly crawl toward 90%, decelerating as it gets higher
      intervalRef.current = setInterval(() => {
        progressRef.current = Math.min(progressRef.current + (90 - progressRef.current) * 0.015, 89.9);
        setProgress(progressRef.current);
      }, 200);
    }

    if (!isVisible && wasVisibleRef.current) {
      // Done! Rush to 100%
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsClosing(true);
      progressRef.current = 100;
      setProgress(100);
      
      // Hide after a brief celebration
      setTimeout(() => {
        setIsClosing(false);
        setProgress(0);
        progressRef.current = 0;
      }, 600);
    }

    wasVisibleRef.current = isVisible;

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isVisible]);

  // Cycle through tips
  useEffect(() => {
    if (!isVisible || isClosing) return;
    const tipTimer = setInterval(() => {
      setTipIndex(prev => (prev + 1) % LOADING_TIPS.length);
    }, 3000);
    return () => clearInterval(tipTimer);
  }, [isVisible, isClosing]);

  const shouldShow = isVisible || isClosing;

  return (
    <div className={`loading-overlay ${shouldShow ? 'visible' : ''}`}>
      <div className="loading-content">
        <div className="loading-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-percentage">{Math.round(progress)}%</div>
        </div>
        
        <div className="loading-text">{message}</div>
        
        <div className="loading-progress-track">
          <div className="loading-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        
        <div className="loading-tip-text" key={tipIndex}>
          {LOADING_TIPS[tipIndex]}
        </div>
        
        <div className="loading-subtext">{subMessage}</div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
