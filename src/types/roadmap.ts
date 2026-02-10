// Type definitions for the course structure

export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface LearningMaterial {
  id: string;
  title: string;
  type: 'reading' | 'video' | 'exercise' | 'reference' | 'summary';
  description?: string;
  content?: string;
  url?: string;
  source?: string;
  youtubeSearch?: string;
  youtubeVideoId?: string;
  youtubeTitle?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface StepTest {
  id: string;
  questions: QuizQuestion[];
  completed: boolean;
  score?: number;
  totalQuestions: number;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  mastered?: boolean;
}

export interface FlashcardDeck {
  id: string;
  title: string;
  description: string;
  cards: Flashcard[];
  createdAt: string;
  sourceType: 'standalone' | 'course';
  sourceCourseId?: string;
  coverImage?: string;
}

export interface CourseStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  estimatedTime: string;
  tasks: Task[];
  materials: LearningMaterial[];
  completed: boolean;
  detailsLoaded: boolean;
  detailsLoading?: boolean;
  test?: StepTest;
  testLoading?: boolean;
  unlocked: boolean; // Whether this step is accessible
  materialProgress?: number; // Index of current material being viewed (for progressive learning)
}

export interface Course {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  totalSteps: number;
  steps: CourseStep[];
  progress: number;
  originalPrompt?: string;
  originalMaterials?: string;
  coverImage?: string;
  flashcards?: Flashcard[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

// Generation mode types
export type GenerationMode = 'course' | 'quiz' | 'flashcards' | 'matching' | 'word-scramble' | 'fill-blank';
export type QuizMode = 'standard' | 'rapid';

// Standalone quiz (not tied to a course step)
export interface StandaloneQuiz {
  id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  createdAt: string;
  isRapid: boolean;
  timePerQuestion?: number; // seconds per question for rapid mode
  coverImage?: string;
}

// Matching Game types
export interface MatchingPair {
  id: string;
  question: string;
  answer: string;
}

export interface MatchingGame {
  id: string;
  title: string;
  description: string;
  pairs: MatchingPair[];
  createdAt: string;
  coverImage?: string;
  bestTime?: number; // Best completion time in seconds
  timesPlayed?: number;
}

// Backwards compatibility
export type RoadmapStep = CourseStep;
export type Roadmap = Course;

// Word Scramble Game types
export interface ScrambleWord {
  id: string;
  word: string;
  hint: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface WordScrambleGame {
  id: string;
  title: string;
  description: string;
  words: ScrambleWord[];
  createdAt: string;
  coverImage?: string;
  bestScore?: number;
  timesPlayed?: number;
}

// Fill in the Blank Game types
export interface FillBlankSentence {
  id: string;
  sentence: string; // Contains ___ as the blank
  answer: string;
  hint?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface FillBlankGame {
  id: string;
  title: string;
  description: string;
  sentences: FillBlankSentence[];
  createdAt: string;
  coverImage?: string;
  bestScore?: number;
  bestTime?: number;
  timesPlayed?: number;
}

export interface GeneratedResponse {
  roadmap: Course;
}
