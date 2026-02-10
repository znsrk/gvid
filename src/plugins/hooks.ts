/**
 * gvidtech Plugin System - Hook Definitions
 * 
 * This file documents ALL available hooks in the gvidtech system.
 * Plugins can use these hooks to modify behavior without changing core code.
 * 
 * Hook Naming Convention:
 * - Filters: noun:verb (e.g., 'course:beforeGenerate', 'quiz:afterScore')
 * - Actions: noun:event (e.g., 'course:created', 'quiz:completed')
 * - Overrides: component:function (e.g., 'render:QuizPage', 'generate:course')
 */

import { 
  Course, 
  CourseStep, 
  FlashcardDeck, 
  Flashcard,
  StandaloneQuiz, 
  QuizQuestion, 
  MatchingGame,
  MatchingPair,
  GenerationMode 
} from '../types/roadmap';

// ============ FILTER HOOK TYPES ============

/**
 * FILTERS modify data as it passes through the application.
 * Multiple plugins can chain filters together (priority ordering).
 * Each filter receives the output of the previous filter.
 */

export interface FilterHooks {
  // ---- CONTENT GENERATION FILTERS ----
  
  /** Modify the prompt before it's sent to AI for course generation */
  'course:beforeGenerate': (prompt: string, files: File[]) => string;
  
  /** Modify the generated course before it's displayed/saved */
  'course:afterGenerate': (course: Course) => Course;
  
  /** Modify step details before they're loaded */
  'step:beforeLoad': (step: CourseStep, courseId: string) => CourseStep;
  
  /** Modify step details after generation */
  'step:afterLoad': (step: CourseStep, courseId: string) => CourseStep;
  
  /** Modify quiz prompt before generation */
  'quiz:beforeGenerate': (prompt: { step: CourseStep; courseTitle: string }) => { step: CourseStep; courseTitle: string };
  
  /** Modify generated quiz questions */
  'quiz:afterGenerate': (questions: QuizQuestion[]) => QuizQuestion[];
  
  /** Modify flashcard prompt before generation */
  'flashcards:beforeGenerate': (prompt: string, context: any) => string;
  
  /** Modify generated flashcards */
  'flashcards:afterGenerate': (cards: Flashcard[]) => Flashcard[];
  
  /** Modify matching game prompt before generation */
  'matching:beforeGenerate': (prompt: string, context: any) => string;
  
  /** Modify generated matching pairs */
  'matching:afterGenerate': (pairs: MatchingPair[]) => MatchingPair[];
  
  // ---- QUIZ FILTERS ----
  
  /** Modify quiz scoring calculation */
  'quiz:calculateScore': (score: { correct: number; total: number; answers: any[] }) => { correct: number; total: number; answers: any[] };
  
  /** Modify quiz pass threshold (default 0.7 = 70%) */
  'quiz:passThreshold': (threshold: number) => number;
  
  /** Modify question display */
  'quiz:displayQuestion': (question: QuizQuestion, index: number) => QuizQuestion;
  
  /** Modify rapid quiz timing */
  'quiz:rapidTiming': (seconds: number) => number;
  
  // ---- FLASHCARD FILTERS ----
  
  /** Modify flashcard before display */
  'flashcard:beforeDisplay': (card: Flashcard, index: number) => Flashcard;
  
  /** Modify next card selection (for spaced repetition) */
  'flashcard:selectNext': (cards: Flashcard[], currentIndex: number) => number;
  
  /** Modify mastery criteria */
  'flashcard:checkMastery': (card: Flashcard, stats: { correct: number; attempts: number }) => boolean;
  
  // ---- MATCHING GAME FILTERS ----
  
  /** Modify cards before game starts */
  'matching:initializeCards': (cards: any[]) => any[];
  
  /** Modify match checking logic */
  'matching:checkMatch': (card1: any, card2: any) => boolean;
  
  /** Modify final score calculation */
  'matching:calculateScore': (stats: { time: number; mistakes: number }) => { time: number; mistakes: number; score?: number };
  
  // ---- NAVIGATION FILTERS ----
  
  /** Modify available pages/routes */
  'navigation:pages': (pages: string[]) => string[];
  
  /** Modify sidebar items */
  'sidebar:items': (items: any[]) => any[];
  
  /** Modify gallery tabs */
  'gallery:tabs': (tabs: { id: string; label: string; count: number }[]) => { id: string; label: string; count: number }[];
  
  // ---- DATA FILTERS ----
  
  /** Modify course before save */
  'course:beforeSave': (course: Course) => Course;
  
  /** Modify course after load */
  'course:afterLoad': (course: Course) => Course;
  
  /** Modify API request before sending */
  'api:beforeRequest': (request: { endpoint: string; method: string; body: any }) => { endpoint: string; method: string; body: any };
  
  /** Modify API response before processing */
  'api:afterResponse': (response: any, endpoint: string) => any;
  
  // ---- RENDERING FILTERS ----
  
  /** Modify LaTeX rendering */
  'render:latex': (latex: string) => string;
  
  /** Modify course card display */
  'render:courseCard': (props: { course: Course }) => { course: Course };
  
  /** Modify flashcard card display */
  'render:flashcardCard': (props: { card: Flashcard; isFlipped: boolean }) => { card: Flashcard; isFlipped: boolean };
}

// ============ ACTION HOOK TYPES ============

/**
 * ACTIONS trigger side effects at specific points.
 * They don't return values - they just execute code.
 * Multiple plugins can respond to the same action.
 */

export interface ActionHooks {
  // ---- APP LIFECYCLE ----
  
  /** App initialization complete */
  'app:init': () => void;
  
  /** App is shutting down */
  'app:shutdown': () => void;
  
  /** User navigated to a new page */
  'app:navigate': (page: string, previousPage: string) => void;
  
  // ---- COURSE ACTIONS ----
  
  /** Course was created */
  'course:created': (course: Course) => void;
  
  /** Course was updated */
  'course:updated': (course: Course, changes: Partial<Course>) => void;
  
  /** Course was deleted */
  'course:deleted': (courseId: string) => void;
  
  /** Course was opened for viewing */
  'course:opened': (course: Course) => void;
  
  /** Course progress changed */
  'course:progressChanged': (course: Course, oldProgress: number, newProgress: number) => void;
  
  // ---- STEP ACTIONS ----
  
  /** Step was completed */
  'step:completed': (step: CourseStep, course: Course) => void;
  
  /** Step was unlocked */
  'step:unlocked': (step: CourseStep, course: Course) => void;
  
  /** Step materials loaded */
  'step:materialsLoaded': (step: CourseStep) => void;
  
  // ---- QUIZ ACTIONS ----
  
  /** Quiz started */
  'quiz:started': (context: { step?: CourseStep; quiz?: StandaloneQuiz }) => void;
  
  /** Quiz question answered */
  'quiz:answered': (question: QuizQuestion, selectedAnswer: number, isCorrect: boolean) => void;
  
  /** Quiz completed */
  'quiz:completed': (result: { score: number; total: number; passed: boolean; timeSpent?: number }) => void;
  
  /** Standalone quiz created */
  'quiz:created': (quiz: StandaloneQuiz) => void;
  
  // ---- FLASHCARD ACTIONS ----
  
  /** Flashcard deck created */
  'flashcards:deckCreated': (deck: FlashcardDeck) => void;
  
  /** Flashcard flipped */
  'flashcard:flipped': (card: Flashcard, toFront: boolean) => void;
  
  /** Flashcard marked as mastered */
  'flashcard:mastered': (card: Flashcard, deck: FlashcardDeck) => void;
  
  /** Study session completed */
  'flashcards:sessionComplete': (stats: { reviewed: number; mastered: number; timeSpent: number }) => void;
  
  // ---- MATCHING GAME ACTIONS ----
  
  /** Matching game created */
  'matching:gameCreated': (game: MatchingGame) => void;
  
  /** Matching game started */
  'matching:gameStarted': (game: MatchingGame) => void;
  
  /** Match found */
  'matching:matchFound': (pair: MatchingPair) => void;
  
  /** Wrong match attempt */
  'matching:wrongMatch': (card1: any, card2: any) => void;
  
  /** Matching game completed */
  'matching:gameCompleted': (stats: { time: number; mistakes: number; game: MatchingGame }) => void;
  
  // ---- FILE ACTIONS ----
  
  /** File uploaded */
  'file:uploaded': (file: File) => void;
  
  /** File processing started */
  'file:processingStarted': (file: File) => void;
  
  /** File processing completed */
  'file:processingCompleted': (file: File, content: string) => void;
  
  // ---- ERROR ACTIONS ----
  
  /** Error occurred */
  'error:occurred': (error: Error, context: string) => void;
  
  /** API error */
  'error:api': (error: any, endpoint: string) => void;
}

// ============ OVERRIDE HOOK TYPES ============

/**
 * OVERRIDES completely replace core functionality.
 * Only ONE plugin can override each hook at a time.
 * Use sparingly - filters are usually better.
 */

export interface OverrideHooks {
  // ---- AI GENERATION OVERRIDES ----
  
  /** Replace course generation entirely */
  'generate:course': (prompt: string, files: File[]) => Promise<Course>;
  
  /** Replace step detail generation */
  'generate:stepDetails': (step: CourseStep, courseTitle: string) => Promise<CourseStep>;
  
  /** Replace quiz generation */
  'generate:quiz': (step: CourseStep, courseTitle: string) => Promise<QuizQuestion[]>;
  
  /** Replace flashcard generation */
  'generate:flashcards': (prompt: string, context: any) => Promise<Flashcard[]>;
  
  /** Replace matching game generation */
  'generate:matchingGame': (prompt: string, context: any) => Promise<MatchingPair[]>;
  
  // ---- COMPONENT OVERRIDES ----
  
  /** Replace entire Quiz page component */
  'render:QuizPage': (props: any) => React.ReactNode;
  
  /** Replace entire Flashcards page component */
  'render:FlashcardsPage': (props: any) => React.ReactNode;
  
  /** Replace entire Matching Game page component */
  'render:MatchingGamePage': (props: any) => React.ReactNode;
  
  /** Replace course view component */
  'render:CourseView': (props: any) => React.ReactNode;
  
  /** Replace material page component */
  'render:MaterialPage': (props: any) => React.ReactNode;
  
  /** Replace sidebar component */
  'render:Sidebar': (props: any) => React.ReactNode;
  
  // ---- ALGORITHM OVERRIDES ----
  
  /** Replace spaced repetition algorithm */
  'algorithm:spacedRepetition': (cards: Flashcard[], history: any) => Flashcard[];
  
  /** Replace quiz question ordering */
  'algorithm:questionOrder': (questions: QuizQuestion[]) => QuizQuestion[];
  
  /** Replace matching card shuffle */
  'algorithm:matchingShuffle': (cards: any[]) => any[];
  
  // ---- STORAGE OVERRIDES ----
  
  /** Replace local storage mechanism */
  'storage:save': (key: string, data: any) => Promise<void>;
  
  /** Replace local storage retrieval */
  'storage:load': (key: string) => Promise<any>;
  
  /** Replace API base URL */
  'config:apiBase': () => string;
}

// ============ HOOK NAME CONSTANTS ============

export const FILTER_HOOKS = {
  // Content Generation
  COURSE_BEFORE_GENERATE: 'course:beforeGenerate',
  COURSE_AFTER_GENERATE: 'course:afterGenerate',
  STEP_BEFORE_LOAD: 'step:beforeLoad',
  STEP_AFTER_LOAD: 'step:afterLoad',
  QUIZ_BEFORE_GENERATE: 'quiz:beforeGenerate',
  QUIZ_AFTER_GENERATE: 'quiz:afterGenerate',
  FLASHCARDS_BEFORE_GENERATE: 'flashcards:beforeGenerate',
  FLASHCARDS_AFTER_GENERATE: 'flashcards:afterGenerate',
  MATCHING_BEFORE_GENERATE: 'matching:beforeGenerate',
  MATCHING_AFTER_GENERATE: 'matching:afterGenerate',
  
  // Quiz
  QUIZ_CALCULATE_SCORE: 'quiz:calculateScore',
  QUIZ_PASS_THRESHOLD: 'quiz:passThreshold',
  QUIZ_DISPLAY_QUESTION: 'quiz:displayQuestion',
  QUIZ_RAPID_TIMING: 'quiz:rapidTiming',
  
  // Flashcards
  FLASHCARD_BEFORE_DISPLAY: 'flashcard:beforeDisplay',
  FLASHCARD_SELECT_NEXT: 'flashcard:selectNext',
  FLASHCARD_CHECK_MASTERY: 'flashcard:checkMastery',
  
  // Matching
  MATCHING_INITIALIZE_CARDS: 'matching:initializeCards',
  MATCHING_CHECK_MATCH: 'matching:checkMatch',
  MATCHING_CALCULATE_SCORE: 'matching:calculateScore',
  
  // Navigation
  NAVIGATION_PAGES: 'navigation:pages',
  SIDEBAR_ITEMS: 'sidebar:items',
  GALLERY_TABS: 'gallery:tabs',
  
  // Data
  COURSE_BEFORE_SAVE: 'course:beforeSave',
  COURSE_AFTER_LOAD: 'course:afterLoad',
  API_BEFORE_REQUEST: 'api:beforeRequest',
  API_AFTER_RESPONSE: 'api:afterResponse',
  
  // Rendering
  RENDER_LATEX: 'render:latex',
  RENDER_COURSE_CARD: 'render:courseCard',
  RENDER_FLASHCARD_CARD: 'render:flashcardCard',
} as const;

export const ACTION_HOOKS = {
  // App Lifecycle
  APP_INIT: 'app:init',
  APP_SHUTDOWN: 'app:shutdown',
  APP_NAVIGATE: 'app:navigate',
  
  // Course
  COURSE_CREATED: 'course:created',
  COURSE_UPDATED: 'course:updated',
  COURSE_DELETED: 'course:deleted',
  COURSE_OPENED: 'course:opened',
  COURSE_PROGRESS_CHANGED: 'course:progressChanged',
  
  // Step
  STEP_COMPLETED: 'step:completed',
  STEP_UNLOCKED: 'step:unlocked',
  STEP_MATERIALS_LOADED: 'step:materialsLoaded',
  
  // Quiz
  QUIZ_STARTED: 'quiz:started',
  QUIZ_ANSWERED: 'quiz:answered',
  QUIZ_COMPLETED: 'quiz:completed',
  QUIZ_CREATED: 'quiz:created',
  
  // Flashcards
  FLASHCARDS_DECK_CREATED: 'flashcards:deckCreated',
  FLASHCARD_FLIPPED: 'flashcard:flipped',
  FLASHCARD_MASTERED: 'flashcard:mastered',
  FLASHCARDS_SESSION_COMPLETE: 'flashcards:sessionComplete',
  
  // Matching
  MATCHING_GAME_CREATED: 'matching:gameCreated',
  MATCHING_GAME_STARTED: 'matching:gameStarted',
  MATCHING_MATCH_FOUND: 'matching:matchFound',
  MATCHING_WRONG_MATCH: 'matching:wrongMatch',
  MATCHING_GAME_COMPLETED: 'matching:gameCompleted',
  
  // File
  FILE_UPLOADED: 'file:uploaded',
  FILE_PROCESSING_STARTED: 'file:processingStarted',
  FILE_PROCESSING_COMPLETED: 'file:processingCompleted',
  
  // Error
  ERROR_OCCURRED: 'error:occurred',
  ERROR_API: 'error:api',
} as const;

export const OVERRIDE_HOOKS = {
  // Generation
  GENERATE_COURSE: 'generate:course',
  GENERATE_STEP_DETAILS: 'generate:stepDetails',
  GENERATE_QUIZ: 'generate:quiz',
  GENERATE_FLASHCARDS: 'generate:flashcards',
  GENERATE_MATCHING_GAME: 'generate:matchingGame',
  
  // Components
  RENDER_QUIZ_PAGE: 'render:QuizPage',
  RENDER_FLASHCARDS_PAGE: 'render:FlashcardsPage',
  RENDER_MATCHING_GAME_PAGE: 'render:MatchingGamePage',
  RENDER_COURSE_VIEW: 'render:CourseView',
  RENDER_MATERIAL_PAGE: 'render:MaterialPage',
  RENDER_SIDEBAR: 'render:Sidebar',
  
  // Algorithms
  ALGORITHM_SPACED_REPETITION: 'algorithm:spacedRepetition',
  ALGORITHM_QUESTION_ORDER: 'algorithm:questionOrder',
  ALGORITHM_MATCHING_SHUFFLE: 'algorithm:matchingShuffle',
  
  // Storage
  STORAGE_SAVE: 'storage:save',
  STORAGE_LOAD: 'storage:load',
  CONFIG_API_BASE: 'config:apiBase',
} as const;
