import React, { useState, useRef, useEffect } from 'react';
import { Course, FlashcardDeck, StandaloneQuiz, MatchingGame, WordScrambleGame, FillBlankGame, GenerationMode, QuizMode } from '../types/roadmap';
import { apiFormData, apiPost } from '../lib/fetch';

interface PromptPageProps {
  onCourseGenerated: (course: Course) => void;
  onFlashcardsGenerated: (deck: FlashcardDeck) => void;
  onQuizGenerated: (quiz: StandaloneQuiz) => void;
  onMatchingGameGenerated: (game: MatchingGame) => void;
  onWordScrambleGenerated: (game: WordScrambleGame) => void;
  onFillBlankGenerated: (game: FillBlankGame) => void;
  onLoadingChange: (loading: boolean, message?: string) => void;
}

const PromptPage: React.FC<PromptPageProps> = ({ 
  onCourseGenerated, 
  onFlashcardsGenerated,
  onQuizGenerated,
  onMatchingGameGenerated,
  onWordScrambleGenerated,
  onFillBlankGenerated,
  onLoadingChange 
}) => {
  const [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [generationMode, setGenerationMode] = useState<GenerationMode>('quiz');
  const [quizMode, setQuizMode] = useState<QuizMode>('standard');
  const [quizClickCount, setQuizClickCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [typingPlaceholder, setTypingPlaceholder] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const quizClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragCounter = useRef(0);
  const placeholderIndex = useRef(0);
  const charIndex = useRef(0);

  // Placeholder texts for each mode
  const placeholders: Record<GenerationMode, string[]> = {
    course: [
      "Teach me calculus from scratch...",
      "I want to learn machine learning...",
      "Help me understand quantum physics...",
      "Create a course on web development...",
      "Explain data structures and algorithms...",
      "I'd like to master Spanish...",
    ],
    quiz: [
      "Test me on world history...",
      "Quiz about organic chemistry...",
      "Questions on JavaScript fundamentals...",
      "Challenge me on biology...",
      "Assess my knowledge of economics...",
    ],
    flashcards: [
      "Vocabulary for French language...",
      "Medical terminology flashcards...",
      "Programming concepts to memorize...",
      "Historical dates and events...",
      "Chemistry formulas and reactions...",
    ],
    matching: [
      "Match capitals with countries...",
      "Pair elements with their symbols...",
      "Connect authors with their books...",
      "Match terms with definitions...",
      "Link historical figures to events...",
    ],
    'word-scramble': [
      "Scramble biology vocabulary...",
      "Unscramble programming terms...",
      "Chemistry elements word puzzle...",
      "Guess the historical terms...",
      "Medical terminology scramble...",
    ],
    'fill-blank': [
      "Fill in the blanks about biology...",
      "Complete sentences on physics...",
      "History fill-in-the-blank quiz...",
      "Programming concepts fill blanks...",
      "Chemistry fill-in-the-blank...",
    ],
  };

  // Typing animation effect
  useEffect(() => {
    if (prompt) return; // Don't animate if user has typed something

    const currentPlaceholders = placeholders[generationMode];
    const currentText = currentPlaceholders[placeholderIndex.current % currentPlaceholders.length];

    const typeInterval = setInterval(() => {
      if (isTyping) {
        if (charIndex.current < currentText.length) {
          setTypingPlaceholder(currentText.substring(0, charIndex.current + 1));
          charIndex.current++;
        } else {
          // Pause at end before deleting
          setTimeout(() => setIsTyping(false), 2000);
          clearInterval(typeInterval);
        }
      } else {
        if (charIndex.current > 0) {
          setTypingPlaceholder(currentText.substring(0, charIndex.current - 1));
          charIndex.current--;
        } else {
          // Move to next placeholder
          placeholderIndex.current++;
          setIsTyping(true);
          clearInterval(typeInterval);
        }
      }
    }, isTyping ? 50 : 30);

    return () => clearInterval(typeInterval);
  }, [generationMode, isTyping, prompt]);

  // Reset typing when mode changes
  useEffect(() => {
    charIndex.current = 0;
    placeholderIndex.current = 0;
    setTypingPlaceholder('');
    setIsTyping(true);
  }, [generationMode]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [prompt]);

  const handleModeClick = (mode: GenerationMode) => {
    if (mode === 'quiz') {
      // Handle multi-tap for quiz mode
      const newClickCount = quizClickCount + 1;
      setQuizClickCount(newClickCount);
      
      if (quizClickTimer.current) {
        clearTimeout(quizClickTimer.current);
      }
      
      quizClickTimer.current = setTimeout(() => {
        setQuizClickCount(0);
      }, 500);

      if (newClickCount === 1) {
        setGenerationMode('quiz');
        setQuizMode('standard');
      } else if (newClickCount === 2) {
        setGenerationMode('quiz');
        setQuizMode('rapid');
      } else if (newClickCount >= 3) {
        setGenerationMode('course');
        setQuizMode('standard');
        setQuizClickCount(0);
      }
    } else {
      setGenerationMode(mode);
      setQuizClickCount(0);
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim() && files.length === 0) {
      setError('Please enter a prompt or upload files');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const loadingMessages: Record<GenerationMode, string> = {
      course: 'Generating your course...',
      quiz: quizMode === 'rapid' ? 'Creating rapid quiz...' : 'Creating quiz questions...',
      flashcards: 'Generating flashcards...',
      matching: 'Creating matching game...',
      'word-scramble': 'Creating word scramble...',
      'fill-blank': 'Creating fill-in-the-blank game...'
    };

    onLoadingChange(true, loadingMessages[generationMode]);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('prompt', prompt);
      files.forEach((file) => formData.append('files', file));

      if (generationMode === 'course') {
        const response = await apiFormData('/generate-roadmap', formData);

        if (!response.ok) throw new Error('Failed to generate course');
        const data = await response.json();
        
        // Generate a cover image
        let coverImage = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        try {
          const imageResponse = await apiPost('/generate-image', { prompt: data.roadmap.title });
          const imageData = await imageResponse.json();
          if (imageData.imageUrl) {
            coverImage = imageData.imageUrl;
          }
        } catch (imgError) {
          console.error('Failed to generate image:', imgError);
        }

        const course: Course = {
          ...data.roadmap,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          progress: 0,
          originalPrompt: prompt,
          originalMaterials: data.originalMaterials || '',
          coverImage: coverImage,
        };

        onCourseGenerated(course);
      } else if (generationMode === 'flashcards') {
        const response = await apiFormData('/generate-flashcards', formData);

        if (!response.ok) throw new Error('Failed to generate flashcards');
        const data = await response.json();
        
        let coverImage = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        try {
          const imageResponse = await apiPost('/generate-image', { prompt: data.title });
          const imageData = await imageResponse.json();
          if (imageData.imageUrl) {
            coverImage = imageData.imageUrl;
          }
        } catch (imgError) {
          console.error('Failed to generate image:', imgError);
        }

        const deck: FlashcardDeck = {
          id: Date.now().toString(),
          title: data.title,
          description: data.description,
          cards: data.cards,
          createdAt: new Date().toISOString(),
          sourceType: 'standalone',
          coverImage: coverImage,
        };

        onFlashcardsGenerated(deck);
      } else if (generationMode === 'quiz') {
        const response = await apiFormData('/generate-standalone-quiz', formData);

        if (!response.ok) throw new Error('Failed to generate quiz');
        const data = await response.json();
        
        let coverImage = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
        try {
          const imageResponse = await apiPost('/generate-image', { prompt: data.title });
          const imageData = await imageResponse.json();
          if (imageData.imageUrl) {
            coverImage = imageData.imageUrl;
          }
        } catch (imgError) {
          console.error('Failed to generate image:', imgError);
        }

        const quiz: StandaloneQuiz = {
          id: Date.now().toString(),
          title: data.title,
          description: data.description,
          questions: data.questions,
          createdAt: new Date().toISOString(),
          isRapid: quizMode === 'rapid',
          timePerQuestion: quizMode === 'rapid' ? 8 : undefined,
          coverImage: coverImage,
        };

        onQuizGenerated(quiz);
      } else if (generationMode === 'matching') {
        const response = await apiFormData('/generate-matching-game', formData);

        if (!response.ok) throw new Error('Failed to generate matching game');
        const data = await response.json();
        
        let coverImage = 'linear-gradient(135deg, #667eea 0%, #f093fb 100%)';
        try {
          const imageResponse = await apiPost('/generate-image', { prompt: data.title });
          const imageData = await imageResponse.json();
          if (imageData.imageUrl) {
            coverImage = imageData.imageUrl;
          }
        } catch (imgError) {
          console.error('Failed to generate image:', imgError);
        }

        const game: MatchingGame = {
          id: Date.now().toString(),
          title: data.title,
          description: data.description,
          pairs: data.pairs,
          createdAt: new Date().toISOString(),
          coverImage: coverImage,
        };

        onMatchingGameGenerated(game);
      } else if (generationMode === 'word-scramble') {
        const response = await apiFormData('/generate-word-scramble', formData);

        if (!response.ok) throw new Error('Failed to generate word scramble');
        const data = await response.json();
        
        let coverImage = 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)';
        try {
          const imageResponse = await apiPost('/generate-image', { prompt: data.title });
          const imageData = await imageResponse.json();
          if (imageData.imageUrl) {
            coverImage = imageData.imageUrl;
          }
        } catch (imgError) {
          console.error('Failed to generate image:', imgError);
        }

        const scrambleGame: WordScrambleGame = {
          id: Date.now().toString(),
          title: data.title,
          description: data.description,
          words: data.words,
          createdAt: new Date().toISOString(),
          coverImage: coverImage,
        };

        onWordScrambleGenerated(scrambleGame);
      } else if (generationMode === 'fill-blank') {
        const response = await apiFormData('/generate-fill-blank', formData);

        if (!response.ok) throw new Error('Failed to generate fill-in-the-blank game');
        const data = await response.json();
        
        let coverImage = 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)';
        try {
          const imageResponse = await apiPost('/generate-image', { prompt: data.title });
          const imageData = await imageResponse.json();
          if (imageData.imageUrl) {
            coverImage = imageData.imageUrl;
          }
        } catch (imgError) {
          console.error('Failed to generate image:', imgError);
        }

        const fillBlankGame: FillBlankGame = {
          id: Date.now().toString(),
          title: data.title,
          description: data.description,
          sentences: data.sentences,
          createdAt: new Date().toISOString(),
          coverImage: coverImage,
        };

        onFillBlankGenerated(fillBlankGame);
      }

      setPrompt('');
      setFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setTimeout(() => setError(null), 3000);
    } finally {
      onLoadingChange(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragPosition({ x: e.clientX, y: e.clientY });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(file => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        return ['pdf', 'txt', 'doc', 'docx', 'md', 'rtf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'].includes(ext || '');
      });
      if (droppedFiles.length > 0) {
        setFiles(prev => [...prev, ...droppedFiles]);
      }
    }
  };

  const getFileIcon = (filename: string, file?: File) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    // Show thumbnail for images
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '') && file) {
      return (
        <img 
          src={URL.createObjectURL(file)} 
          alt={filename}
          className="file-preview-thumbnail"
        />
      );
    }
    
    switch (ext) {
      case 'pdf':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        );
      case 'doc':
      case 'docx':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <line x1="10" y1="9" x2="8" y2="9"/>
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        );
    }
  };

  const getModeDescription = () => {
    switch (generationMode) {
      case 'course':
        return 'Full learning course with steps, materials, and quizzes';
      case 'quiz':
        return quizMode === 'rapid' 
          ? 'Fast-paced quiz with 8 seconds per question' 
          : 'Test your knowledge with multiple choice questions';
      case 'flashcards':
        return 'Study cards for memorization and quick review';
      case 'matching':
        return 'Match questions with answers in a fun grid game';
      case 'word-scramble':
        return 'Unscramble key terms and vocabulary for gamified learning';
      case 'fill-blank':
        return 'Complete sentences by filling in the missing words';
    }
  };

  return (
    <div 
      className="prompt-page"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="drag-blur-overlay">
          <div 
            className="drag-cursor-icon" 
            style={{ left: dragPosition.x, top: dragPosition.y }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span>Drop to upload</span>
          </div>
        </div>
      )}
      <div className="prompt-background">
        <div className="bg-gradient bg-gradient-1"></div>
        <div className="bg-gradient bg-gradient-2"></div>
        <div className="bg-gradient bg-gradient-3"></div>
        <div className="bg-gradient bg-gradient-4"></div>
      </div>
      <div className="prompt-content">
        <div className="prompt-hero">
          <h1>What would you like to learn?</h1>
          <p>Create personalized learning content with AI</p>
        </div>

      <div className="generation-modes">
        <button 
          className={`mode-btn ${generationMode === 'quiz' ? 'active' : ''} ${generationMode === 'quiz' && quizMode === 'rapid' ? 'rapid' : ''}`}
          onClick={() => handleModeClick('quiz')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          {generationMode === 'quiz' && quizMode === 'rapid' ? 'Rapid Quiz ⚡' : 'Quiz'}
        </button>
        <button 
          className={`mode-btn ${generationMode === 'flashcards' ? 'active' : ''}`}
          onClick={() => handleModeClick('flashcards')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="M7 8h10"/>
            <path d="M7 12h6"/>
          </svg>
          Flashcards
        </button>
        <button 
          className={`mode-btn ${generationMode === 'matching' ? 'active' : ''}`}
          onClick={() => handleModeClick('matching')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
          Match
        </button>
        <button 
          className={`mode-btn ${generationMode === 'word-scramble' ? 'active' : ''}`}
          onClick={() => handleModeClick('word-scramble')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16"/>
            <path d="M6 20l3-7"/>
            <path d="M18 20l-3-7"/>
            <path d="M7.5 13h9"/>
            <path d="M9 4l1 3"/>
            <path d="M15 4l-1 3"/>
          </svg>
          Scramble
        </button>
        <button 
          className={`mode-btn ${generationMode === 'fill-blank' ? 'active' : ''}`}
          onClick={() => handleModeClick('fill-blank')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16"/>
            <path d="M4 12h8"/>
            <path d="M14 12h6" strokeDasharray="2 2"/>
            <path d="M4 17h12"/>
          </svg>
          Fill Blank
        </button>
        <button 
          className={`mode-btn ${generationMode === 'course' ? 'active' : ''}`}
          onClick={() => handleModeClick('course')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          Course
        </button>
      </div>

      <p className="mode-description">{getModeDescription()}</p>

      <div className={`input-container ${isDragging ? 'dragging' : ''}`}>
        
        {files.length > 0 && (
          <div className="file-upload-banner">
            <span>{files.length} file{files.length > 1 ? 's' : ''} attached</span>
            <button className="file-upload-banner-clear" onClick={() => setFiles([])}>
              Clear all
            </button>
          </div>
        )}

        {files.length > 0 && (
          <div className="file-preview-grid">
            {files.map((file, index) => (
              <div key={index} className="file-preview-box">
                <div className="file-preview-icon">
                  {getFileIcon(file.name, file)}
                </div>
                <div className="file-preview-info">
                  <span className="file-preview-name">{file.name}</span>
                  <span className="file-preview-size">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
                <button className="file-preview-remove" onClick={() => removeFile(index)}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="input-bar">
          <textarea
            ref={textareaRef}
            className="input-textarea"
            placeholder={prompt ? '' : typingPlaceholder || '|'}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <div className="input-actions">
            <input
              ref={fileInputRef}
              type="file"
              className="file-input-hidden"
              multiple
              accept=".pdf,.txt,.doc,.docx,.md,.rtf,.jpg,.jpeg,.png,.gif,.webp,.heic,.heif"
              onChange={handleFileSelect}
            />
            <button 
              className={`input-btn ${files.length > 0 ? 'has-files' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              title="Upload files"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
              {files.length > 0 && <span className="file-count-badge">{files.length}</span>}
            </button>
            <button
              className="input-btn submit"
              onClick={handleSubmit}
              disabled={!prompt.trim() && files.length === 0}
              title={`Generate ${generationMode}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <div className="prompt-tips">
        <p>💡 <strong>Tips:</strong> Be specific about your learning goals • Upload PDFs, images, or documents for AI-powered content • Double-tap Quiz for Rapid mode ⚡</p>
      </div>
      </div>

      {error && <div className="error-toast">{error}</div>}
    </div>
  );
};

export default PromptPage;
