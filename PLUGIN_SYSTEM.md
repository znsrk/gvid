# gvidtech Plugin System Documentation

> A comprehensive guide to creating, installing, and managing plugins for the gvidtech learning platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Plugin File Structure](#plugin-file-structure)
4. [Writing Your First Plugin](#writing-your-first-plugin)
5. [Hook Types](#hook-types)
   - [Filters](#filters)
   - [Actions](#actions)
   - [Overrides](#overrides)
6. [Settings System](#settings-system)
7. [CSS Variable Hooks](#css-variable-hooks)
8. [DOM Event Hooks](#dom-event-hooks)
9. [Complete Hook Reference](#complete-hook-reference)
10. [Best Practices](#best-practices)
11. [Example Plugins](#example-plugins)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The gvidtech Plugin System is inspired by WordPress's hook architecture. It allows developers to:

- **Modify data** as it flows through the application (Filters)
- **Execute code** at specific points in the app lifecycle (Actions)
- **Replace functionality** entirely (Overrides)
- **Theme the UI** via CSS variables
- **React to events** via DOM custom events

Plugins are JavaScript files that export a configuration object. They can be installed, enabled, disabled, and uninstalled at runtime by interacting with the core.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     gvidtech Application                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│   │   Filters    │    │   Actions    │    │  Overrides   │  │
│   │              │    │              │    │              │  │
│   │ Modify Data  │    │ Side Effects │    │   Replace    │  │
│   │   In-Place   │    │   Execute    │    │   Entirely   │  │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│          │                   │                   │          │
│          └───────────────────┼───────────────────┘          │
│                              │                              │
│                    ┌─────────▼─────────┐                    │
│                    │   Plugin Manager   │                    │
│                    │                    │                    │
│                    │ - Install/Uninstall│                    │
│                    │ - Enable/Disable   │                    │
│                    │ - Settings Storage │                    │
│                    │ - Hook Registry    │                    │
│                    └─────────┬─────────┘                    │
│                              │                              │
│          ┌───────────────────┼───────────────────┐          │
│          │                   │                   │          │
│   ┌──────▼───────┐    ┌──────▼───────┐    ┌──────▼───────┐  │
│   │   Plugin A   │    │   Plugin B   │    │   Plugin C   │  │
│   │ (dark-mode)  │    │(sound-effects)│   │(strict-quiz) │  │
│   └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Example

```
User Action → Core Code → applyFilters() → Plugin A → Plugin B → Result
                              ↓
                         doAction() → Plugin A callback
                                   → Plugin B callback
```

---

## Plugin File Structure

A plugin is a single `.plugin.js` file that returns a JavaScript object using an IIFE (Immediately Invoked Function Expression) pattern.

### Basic Structure

```javascript
/**
 * Plugin Name
 * Brief description of what this plugin does
 */
({
  // ═══════════════════════════════════════════════════════════
  // REQUIRED PROPERTIES
  // ═══════════════════════════════════════════════════════════
  
  id: "my-plugin",              // Unique identifier (kebab-case)
  name: "My Plugin",            // Display name
  version: "1.0.0",             // Semantic version
  description: "What it does",  // Short description
  
  // ═══════════════════════════════════════════════════════════
  // OPTIONAL PROPERTIES
  // ═══════════════════════════════════════════════════════════
  
  author: "Your Name",          // Author name
  
  // Settings array (see Settings section)
  settings: [],
  
  // Hook handlers (see Hooks section)
  hooks: {},
  
  // Private properties (prefix with underscore)
  _privateData: null,
  
  // Private methods
  _helperMethod: function() {},
  
  // ═══════════════════════════════════════════════════════════
  // LIFECYCLE METHODS
  // ═══════════════════════════════════════════════════════════
  
  // Called when plugin is enabled
  activate: function(settings) {
    console.log("Plugin activated with settings:", settings);
  },
  
  // Called when plugin is disabled
  deactivate: function() {
    console.log("Plugin deactivated");
    // Clean up resources here
  }
})
```

### File Naming Convention

```
my-plugin.plugin.js
dark-mode-enhanced.plugin.js
sound-effects.plugin.js
```

### How Plugins Are Parsed

When a plugin is installed, the system:

1. **Reads the file content** as a string
2. **Strips comments** (both `/* */` and `//`)
3. **Wraps in Function constructor**: `new Function('return ' + code)()`
4. **Validates required fields**: `id`, `name`, `version`
5. **Extracts hooks** from the `hooks` object
6. **Creates wrapped handlers** that inject current settings
7. **Stores the plugin** in localStorage for persistence

```javascript
// Internal parsing (simplified)
const strippedCode = code
  .replace(/^[\s]*\/\*[\s\S]*?\*\/[\s]*/, '')  // Remove block comments
  .replace(/^[\s]*\/\/.*\n/gm, '')              // Remove line comments
  .trim();

const pluginModule = new Function('return ' + strippedCode)();
```

---

## Writing Your First Plugin

### Step 1: Create the File

Create a new file: `my-first-plugin.plugin.js`

```javascript
/**
 * My First Plugin
 * A simple plugin that logs quiz completions
 */
({
  id: "my-first-plugin",
  name: "My First Plugin",
  version: "1.0.0",
  description: "Logs a message when you complete a quiz",
  author: "Me",
  
  settings: [
    {
      key: "showAlert",
      type: "boolean",
      label: "Show Alert",
      description: "Show an alert instead of console log",
      default: false
    }
  ],
  
  hooks: {},
  
  activate: function(settings) {
    var self = this;
    
    // Listen for quiz completion
    self._handler = function(e) {
      var data = e.detail;
      var message = "Quiz completed! Score: " + data.score + "/" + data.total;
      
      if (settings && settings.showAlert) {
        alert(message);
      } else {
        console.log(message);
      }
    };
    
    document.addEventListener("gvidtech:quiz:completed", self._handler);
    console.log("[My First Plugin] Activated!");
  },
  
  deactivate: function() {
    if (this._handler) {
      document.removeEventListener("gvidtech:quiz:completed", this._handler);
    }
    console.log("[My First Plugin] Deactivated!");
  }
})
```

### Step 2: Install the Plugin

1. Go to **Plugins** page in gvidtech
2. Click **Upload Custom Plugin** or drag & drop the file
3. The plugin will appear in the list
4. Click **Enable** to activate it

### Step 3: Test It

1. Start a quiz
2. Complete the quiz
3. Check the console (or see an alert) for your message

---

## Hook Types

### Filters

**Filters modify data as it passes through the application.** Multiple plugins can chain filters together.

#### How Filters Work

```
Original Value → Filter A → Filter B → Filter C → Final Value
       ↓              ↓          ↓          ↓
   (input)        (modify)  (modify)   (modify)
```

#### Using Filters in Plugins

```javascript
({
  id: "quiz-modifier",
  name: "Quiz Modifier",
  version: "1.0.0",
  description: "Modifies quiz behavior",
  
  settings: [
    {
      key: "bonusPoints",
      type: "number",
      label: "Bonus Points",
      default: 0
    }
  ],
  
  hooks: {
    // Filter receives: (currentValue, settings)
    // Must return: modified value (same type)
    
    "quiz:passThreshold": function(threshold, settings) {
      // Change pass threshold from 70% to 50%
      return 0.5;
    },
    
    "quiz:calculateScore": function(score, settings) {
      // Add bonus points
      var bonus = (settings && settings.bonusPoints) || 0;
      return {
        correct: score.correct + bonus,
        total: score.total,
        answers: score.answers
      };
    }
  },
  
  activate: function(settings) {},
  deactivate: function() {}
})
```

#### Filter Priority

Filters execute in priority order (lower numbers first):

```javascript
// In PluginManager: addFilter(hookName, callback, priority, pluginId)
// Default priority is 10

// Priority 1 runs first
// Priority 10 runs after 1
// Priority 100 runs last
```

### Actions

**Actions execute code at specific points but don't return values.** Use them for side effects like logging, analytics, or UI updates.

#### How Actions Work

```
Event Occurs → doAction('hook:name', data)
                    ↓
            Plugin A callback executes
            Plugin B callback executes
            Plugin C callback executes
```

#### Using Actions via DOM Events

If you require proper `this` binding, the other approach is to use DOM custom events:

```javascript
({
  id: "quiz-logger",
  name: "Quiz Logger",
  version: "1.0.0",
  description: "Logs quiz events",
  
  hooks: {},  // Empty - using DOM events instead
  
  activate: function(settings) {
    var self = this;
    
    // Quiz answered
    self._onAnswered = function(e) {
      var data = e.detail;
      console.log("Answered:", data.isCorrect ? "✓" : "✗");
    };
    
    // Quiz completed
    self._onCompleted = function(e) {
      var data = e.detail;
      console.log("Final score:", data.score + "/" + data.total);
    };
    
    document.addEventListener("gvidtech:quiz:answered", self._onAnswered);
    document.addEventListener("gvidtech:quiz:completed", self._onCompleted);
  },
  
  deactivate: function() {
    document.removeEventListener("gvidtech:quiz:answered", this._onAnswered);
    document.removeEventListener("gvidtech:quiz:completed", this._onCompleted);
  }
})
```

### Overrides

**Overrides completely replace core functionality.** Only ONE plugin can override each hook.

```javascript
({
  id: "custom-quiz-generator",
  name: "Custom Quiz Generator",
  version: "1.0.0",
  description: "Replaces the quiz generation algorithm",
  
  hooks: {
    // This completely replaces the quiz generation
    "generate:quiz": async function(step, courseTitle, settings) {
      // Your custom quiz generation logic
      return [
        {
          question: "Custom question 1",
          options: ["A", "B", "C", "D"],
          correctAnswer: 0
        },
        // ... more questions
      ];
    }
  },
  
  activate: function(settings) {},
  deactivate: function() {}
})
```

⚠️ **Warning**: Use overrides sparingly. Filters are usually a better choice.

---

## Settings System

Settings allow users to configure your plugin without editing code.

### Setting Types

| Type | Description | Input Control |
|------|-------------|---------------|
| `boolean` | True/false | Toggle button |
| `number` | Numeric value | Number input |
| `string` | Text value | Text input |
| `select` | Choice from options | Dropdown |

### Settings Definition

```javascript
settings: [
  // Boolean setting
  {
    key: "enabled",
    type: "boolean",
    label: "Enable Feature",
    description: "Turn this feature on or off",
    default: true
  },
  
  // Number setting
  {
    key: "volume",
    type: "number",
    label: "Volume (%)",
    description: "Sound volume from 0-100",
    default: 50
  },
  
  // String setting
  {
    key: "prefix",
    type: "string",
    label: "Message Prefix",
    description: "Text to show before messages",
    default: "[Plugin]"
  },
  
  // Select setting
  {
    key: "theme",
    type: "select",
    label: "Theme",
    description: "Choose a color theme",
    default: "dark",
    options: [
      { value: "dark", label: "Dark Mode" },
      { value: "light", label: "Light Mode" },
      { value: "auto", label: "System Default" }
    ]
  }
]
```

### Accessing Settings

Settings are automatically passed to your functions:

```javascript
// In hooks
hooks: {
  "quiz:passThreshold": function(threshold, settings) {
    // settings.myKey contains the current value
    return (settings && settings.customThreshold) || threshold;
  }
},

// In activate/deactivate
activate: function(settings) {
  var volume = (settings && settings.volume) || 50;
  console.log("Volume set to:", volume);
}
```

---

## CSS Variable Hooks

Plugins can theme the entire UI by modifying CSS custom properties.

### Available CSS Variables

```css
/* Primary Colors */
--primary: #0b4c8a;
--primary-hover: #1400a0;
--primary-light: rgba(24, 0, 173, 0.1);

/* Background */
--background: #f5f5f7;
--content-bg: #f5f5f7;

/* Surfaces */
--surface: #ffffff;
--surface-secondary: #f7f7f8;
--surface-tertiary: #ececf1;

/* Cards */
--card-bg: #ffffff;
--card-border: #e5e5e5;
--card-shadow: 0 0 15px rgba(0,0,0,0.1);

/* Header */
--header-bg: #ffffff;

/* Borders */
--border: #e5e5e5;
--border-light: #f0f0f0;
--divider: #e0e0e0;

/* Text */
--text-primary: #0d0d0d;
--text-secondary: #6e6e80;
--text-tertiary: #8e8ea0;

/* Sidebar */
--sidebar-bg: #f9f9f9;
--sidebar-text: #0d0d0d;
--sidebar-icon: #6e6e80;
--sidebar-active-bg: rgba(24, 0, 173, 0.1);
--sidebar-active-text: #0b4c8a;

/* Status Colors */
--success: #22c55e;
--error: #ef4444;
--warning: #f59e0b;
--info: #3b82f6;

/* Shadows */
--shadow: 0 0 15px rgba(0,0,0,0.1);
--shadow-sm: 0 2px 8px rgba(0,0,0,0.08);
--shadow-lg: 0 4px 20px rgba(0,0,0,0.12);
--shadow-xl: 0 8px 32px rgba(0,0,0,0.15);

/* Spacing */
--radius: 12px;
--radius-sm: 8px;
--radius-lg: 16px;
--sidebar-width: 260px;
--header-height: 64px;

/* Hover */
--hover-bg: #ececf1;
```

### Theme Plugin Example

```javascript
({
  id: "dark-theme",
  name: "Dark Theme",
  version: "1.0.0",
  description: "Applies a dark color scheme",
  
  hooks: {},
  
  activate: function(settings) {
    var root = document.documentElement;
    
    // Set dark colors
    root.style.setProperty("--background", "#0f0f1a");
    root.style.setProperty("--surface", "#1a1a2e");
    root.style.setProperty("--text-primary", "#e4e4e7");
    root.style.setProperty("--border", "#2a2a4a");
    // ... more variables
    
    // Optional: Add data attribute for CSS targeting
    document.body.setAttribute("data-theme", "dark");
  },
  
  deactivate: function() {
    var root = document.documentElement;
    
    // Remove all custom properties
    root.style.removeProperty("--background");
    root.style.removeProperty("--surface");
    root.style.removeProperty("--text-primary");
    root.style.removeProperty("--border");
    // ... more
    
    document.body.removeAttribute("data-theme");
  }
})
```

---

## DOM Event Hooks

The app dispatches custom DOM events that plugins can listen to.

### Available Events

| Event | Data | Description |
|-------|------|-------------|
| `gvidtech:quiz:answered` | `{ question, selectedAnswer, isCorrect, questionIndex }` | User answered a question |
| `gvidtech:quiz:completed` | `{ course, step, score, total, passed, questions }` | Quiz finished |
| `gvidtech:matching:matchFound` | `{ game, pairId, matchedCount, totalPairs }` | Correct match in matching game |
| `gvidtech:matching:gameCompleted` | `{ game, time, mistakes, isNewBestTime }` | Matching game finished |

### Listening to Events

```javascript
activate: function(settings) {
  var self = this;
  
  self._handler = function(event) {
    var data = event.detail;
    console.log("Event data:", data);
  };
  
  document.addEventListener("gvidtech:quiz:answered", self._handler);
},

deactivate: function() {
  document.removeEventListener("gvidtech:quiz:answered", this._handler);
}
```

---

## Complete Hook Reference

### Filter Hooks

#### Content Generation

| Hook | Input | Description |
|------|-------|-------------|
| `course:beforeGenerate` | `(prompt: string, files: File[])` | Modify AI prompt before course generation |
| `course:afterGenerate` | `(course: Course)` | Modify generated course before display |
| `step:beforeLoad` | `(step: CourseStep, courseId: string)` | Modify step before loading |
| `step:afterLoad` | `(step: CourseStep, courseId: string)` | Modify step after generation |
| `quiz:beforeGenerate` | `({ step, courseTitle })` | Modify quiz prompt before generation |
| `quiz:afterGenerate` | `(questions: QuizQuestion[])` | Modify generated quiz questions |
| `flashcards:beforeGenerate` | `(prompt: string, context: any)` | Modify flashcard prompt |
| `flashcards:afterGenerate` | `(cards: Flashcard[])` | Modify generated flashcards |
| `matching:beforeGenerate` | `(prompt: string, context: any)` | Modify matching game prompt |
| `matching:afterGenerate` | `(pairs: MatchingPair[])` | Modify generated matching pairs |

#### Quiz

| Hook | Input | Description |
|------|-------|-------------|
| `quiz:calculateScore` | `({ correct, total, answers })` | Modify score calculation |
| `quiz:passThreshold` | `(threshold: number)` | Change pass percentage (default 0.7) |
| `quiz:displayQuestion` | `(question, index)` | Modify question before display |
| `quiz:rapidTiming` | `(seconds: number)` | Change rapid quiz timer |

#### Flashcards

| Hook | Input | Description |
|------|-------|-------------|
| `flashcard:beforeDisplay` | `(card, index)` | Modify card before showing |
| `flashcard:selectNext` | `(cards[], currentIndex)` | Change next card selection |
| `flashcard:checkMastery` | `(card, { correct, attempts })` | Modify mastery check |

#### Matching Game

| Hook | Input | Description |
|------|-------|-------------|
| `matching:initializeCards` | `(cards[])` | Modify cards before game |
| `matching:checkMatch` | `(card1, card2)` | Override match logic |
| `matching:calculateScore` | `({ time, mistakes })` | Modify score calculation |

#### Navigation

| Hook | Input | Description |
|------|-------|-------------|
| `navigation:pages` | `(pages: string[])` | Modify available pages |
| `sidebar:items` | `(items[])` | Modify sidebar menu items |
| `gallery:tabs` | `(tabs[])` | Modify gallery tab list |

#### Data

| Hook | Input | Description |
|------|-------|-------------|
| `course:beforeSave` | `(course: Course)` | Modify course before saving |
| `course:afterLoad` | `(course: Course)` | Modify course after loading |
| `api:beforeRequest` | `({ endpoint, method, body })` | Modify API request |
| `api:afterResponse` | `(response, endpoint)` | Modify API response |

#### Rendering

| Hook | Input | Description |
|------|-------|-------------|
| `render:latex` | `(latex: string)` | Modify LaTeX before rendering |
| `render:courseCard` | `({ course })` | Modify course card props |
| `render:flashcardCard` | `({ card, isFlipped })` | Modify flashcard props |

### Action Hooks

#### App Lifecycle

| Hook | Data | Description |
|------|------|-------------|
| `app:init` | `()` | App initialized |
| `app:shutdown` | `()` | App shutting down |
| `app:navigate` | `(page, previousPage)` | Page navigation |

#### Course

| Hook | Data | Description |
|------|------|-------------|
| `course:created` | `(course)` | New course created |
| `course:updated` | `(course, changes)` | Course modified |
| `course:deleted` | `(courseId)` | Course deleted |
| `course:opened` | `(course)` | Course opened for viewing |
| `course:progressChanged` | `(course, oldProgress, newProgress)` | Progress updated |

#### Step

| Hook | Data | Description |
|------|------|-------------|
| `step:completed` | `(step, course)` | Step marked complete |
| `step:unlocked` | `(step, course)` | Step became available |
| `step:materialsLoaded` | `(step)` | Step content loaded |

#### Quiz

| Hook | Data | Description |
|------|------|-------------|
| `quiz:started` | `({ step?, quiz? })` | Quiz began |
| `quiz:answered` | `(question, answer, isCorrect)` | Question answered |
| `quiz:completed` | `({ score, total, passed, timeSpent? })` | Quiz finished |
| `quiz:created` | `(quiz)` | Standalone quiz created |

#### Flashcards

| Hook | Data | Description |
|------|------|-------------|
| `flashcards:deckCreated` | `(deck)` | New deck created |
| `flashcard:flipped` | `(card, toFront)` | Card flipped |
| `flashcard:mastered` | `(card, deck)` | Card marked mastered |
| `flashcards:sessionComplete` | `({ reviewed, mastered, timeSpent })` | Study session done |

#### Matching Game

| Hook | Data | Description |
|------|------|-------------|
| `matching:gameCreated` | `(game)` | New game created |
| `matching:gameStarted` | `(game)` | Game began |
| `matching:matchFound` | `(pair)` | Correct match |
| `matching:wrongMatch` | `(card1, card2)` | Wrong match |
| `matching:gameCompleted` | `({ time, mistakes, game })` | Game finished |

#### File

| Hook | Data | Description |
|------|------|-------------|
| `file:uploaded` | `(file)` | File uploaded |
| `file:processingStarted` | `(file)` | Processing began |
| `file:processingCompleted` | `(file, content)` | Processing done |

#### Error

| Hook | Data | Description |
|------|------|-------------|
| `error:occurred` | `(error, context)` | Error happened |
| `error:api` | `(error, endpoint)` | API error |

### Override Hooks

| Hook | Replaces | Description |
|------|----------|-------------|
| `generate:course` | Course generation | Custom course AI |
| `generate:stepDetails` | Step detail generation | Custom step AI |
| `generate:quiz` | Quiz generation | Custom quiz AI |
| `generate:flashcards` | Flashcard generation | Custom flashcard AI |
| `generate:matchingGame` | Matching game generation | Custom matching AI |
| `render:QuizPage` | Quiz page component | Custom quiz UI |
| `render:FlashcardsPage` | Flashcards page | Custom flashcard UI |
| `render:MatchingGamePage` | Matching game page | Custom matching UI |
| `render:CourseView` | Course view | Custom course UI |
| `render:MaterialPage` | Material page | Custom material UI |
| `render:Sidebar` | Sidebar component | Custom sidebar |
| `algorithm:spacedRepetition` | Card selection | Custom SRS |
| `algorithm:questionOrder` | Question ordering | Custom order |
| `algorithm:matchingShuffle` | Card shuffle | Custom shuffle |
| `storage:save` | localStorage save | Custom storage |
| `storage:load` | localStorage load | Custom storage |
| `config:apiBase` | API base URL | Custom API |

---

## Best Practices

### 1. Use `var` and `function` (not `let`/`const`/arrow functions)

Plugin code is evaluated at runtime. For maximum compatibility:

```javascript
// ✓ Good
var self = this;
var myFunc = function(x) { return x * 2; };

// ✗ Avoid (may cause issues)
const self = this;
const myFunc = (x) => x * 2;
```

### 2. Always Clean Up in `deactivate`

```javascript
activate: function(settings) {
  this._interval = setInterval(doSomething, 1000);
  this._element = document.createElement("div");
  document.body.appendChild(this._element);
},

deactivate: function() {
  // Always clean up!
  if (this._interval) clearInterval(this._interval);
  if (this._element && this._element.parentNode) {
    this._element.parentNode.removeChild(this._element);
  }
}
```

### 3. Prefix Private Properties with Underscore

```javascript
({
  id: "my-plugin",
  
  // Public
  name: "My Plugin",
  
  // Private (convention)
  _internalData: null,
  _helperMethod: function() {}
})
```

### 4. Handle Missing Settings Gracefully

```javascript
activate: function(settings) {
  // Always provide defaults
  var volume = (settings && settings.volume) || 50;
  var enabled = settings ? settings.enabled !== false : true;
}
```

### 5. Use DOM Events Instead of Hook Objects for Side Effects

```javascript
// ✓ Recommended for actions
activate: function(settings) {
  var self = this;
  self._handler = function(e) { /* ... */ };
  document.addEventListener("gvidtech:quiz:answered", self._handler);
}

// ✗ May have `this` binding issues
hooks: {
  "quiz:answered": function(data, settings) {
    this._playSound(); // `this` might not be the plugin!
  }
}
```

### 6. Return the Same Type in Filters

```javascript
hooks: {
  // ✓ Returns same type (number)
  "quiz:passThreshold": function(threshold, settings) {
    return 0.9; // number in, number out
  },
  
  // ✓ Returns same type (object)
  "quiz:calculateScore": function(score, settings) {
    return {
      correct: score.correct + 1,
      total: score.total,
      answers: score.answers
    };
  }
}
```

---

## Example Plugins

### Minimal Plugin

```javascript
({
  id: "minimal",
  name: "Minimal Plugin",
  version: "1.0.0",
  description: "Does nothing but log activation",
  
  hooks: {},
  
  activate: function(settings) {
    console.log("Minimal plugin activated!");
  },
  
  deactivate: function() {
    console.log("Minimal plugin deactivated!");
  }
})
```

### Filter Plugin (Quiz Threshold)

```javascript
({
  id: "easy-mode",
  name: "Easy Mode",
  version: "1.0.0",
  description: "Lower quiz passing threshold to 50%",
  
  settings: [
    {
      key: "threshold",
      type: "number",
      label: "Pass Threshold (%)",
      default: 50
    }
  ],
  
  hooks: {
    "quiz:passThreshold": function(threshold, settings) {
      return (settings && settings.threshold) ? settings.threshold / 100 : 0.5;
    }
  },
  
  activate: function(settings) {
    console.log("[Easy Mode] Pass threshold set to " + ((settings && settings.threshold) || 50) + "%");
  },
  
  deactivate: function() {
    console.log("[Easy Mode] Deactivated - threshold reset");
  }
})
```

### Action Plugin (Sound Effects)

```javascript
({
  id: "sound-effects",
  name: "Sound Effects",
  version: "1.0.0",
  description: "Play sounds on quiz answers",
  
  settings: [
    {
      key: "volume",
      type: "number",
      label: "Volume (%)",
      default: 50
    }
  ],
  
  _audioContext: null,
  
  _playTone: function(freq, duration, vol) {
    try {
      if (!this._audioContext) {
        this._audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      var ctx = this._audioContext;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.value = vol * 0.3;
      osc.frequency.value = freq;
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  },
  
  hooks: {},
  
  activate: function(settings) {
    var self = this;
    var vol = ((settings && settings.volume) || 50) / 100;
    
    self._handler = function(e) {
      var data = e.detail;
      if (data.isCorrect) {
        self._playTone(523, 0.1, vol);
        setTimeout(function() { self._playTone(659, 0.1, vol); }, 100);
        setTimeout(function() { self._playTone(784, 0.15, vol); }, 200);
      } else {
        self._playTone(200, 0.3, vol * 0.5);
      }
    };
    
    document.addEventListener("gvidtech:quiz:answered", self._handler);
  },
  
  deactivate: function() {
    document.removeEventListener("gvidtech:quiz:answered", this._handler);
    if (this._audioContext) {
      this._audioContext.close();
      this._audioContext = null;
    }
  }
})
```

### Theme Plugin (Dark Mode)

```javascript
({
  id: "dark-mode",
  name: "Dark Mode",
  version: "1.0.0",
  description: "Apply dark color scheme",
  
  settings: [
    {
      key: "theme",
      type: "select",
      label: "Theme Variant",
      default: "midnight",
      options: [
        { value: "midnight", label: "Midnight Blue" },
        { value: "forest", label: "Forest Green" }
      ]
    }
  ],
  
  hooks: {},
  
  activate: function(settings) {
    var theme = (settings && settings.theme) || "midnight";
    var themes = {
      midnight: { bg: "#0f0f1a", surface: "#1a1a2e", text: "#e4e4e7" },
      forest: { bg: "#0a1a0a", surface: "#1a2e1a", text: "#e4e7e4" }
    };
    var colors = themes[theme];
    var root = document.documentElement;
    
    root.style.setProperty("--background", colors.bg);
    root.style.setProperty("--surface", colors.surface);
    root.style.setProperty("--text-primary", colors.text);
  },
  
  deactivate: function() {
    var root = document.documentElement;
    root.style.removeProperty("--background");
    root.style.removeProperty("--surface");
    root.style.removeProperty("--text-primary");
  }
})
```

### UI Widget Plugin (Timer)

```javascript
({
  id: "study-timer",
  name: "Study Timer",
  version: "1.0.0",
  description: "Floating timer widget",
  
  settings: [
    {
      key: "position",
      type: "select",
      label: "Position",
      default: "bottom-right",
      options: [
        { value: "top-left", label: "Top Left" },
        { value: "bottom-right", label: "Bottom Right" }
      ]
    }
  ],
  
  _element: null,
  _interval: null,
  _startTime: null,
  
  _formatTime: function(ms) {
    var s = Math.floor(ms / 1000) % 60;
    var m = Math.floor(ms / 60000);
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  },
  
  hooks: {},
  
  activate: function(settings) {
    var self = this;
    var pos = (settings && settings.position) || "bottom-right";
    
    self._startTime = Date.now();
    
    // Create widget
    self._element = document.createElement("div");
    self._element.style.cssText = "position:fixed;" + 
      (pos === "top-left" ? "top:20px;left:20px;" : "bottom:20px;right:20px;") +
      "background:var(--surface);border:1px solid var(--border);border-radius:12px;" +
      "padding:12px 16px;font-family:monospace;font-size:18px;z-index:9999;";
    self._element.textContent = "⏱️ 00:00";
    document.body.appendChild(self._element);
    
    // Update every second
    self._interval = setInterval(function() {
      var elapsed = Date.now() - self._startTime;
      self._element.textContent = "⏱️ " + self._formatTime(elapsed);
    }, 1000);
  },
  
  deactivate: function() {
    if (this._interval) clearInterval(this._interval);
    if (this._element && this._element.parentNode) {
      this._element.parentNode.removeChild(this._element);
    }
  }
})
```

---

## Troubleshooting

### Plugin Won't Install

**Error: "Plugin must have id, name, and version"**

Make sure your plugin object has all required properties:

```javascript
({
  id: "required",      // ← Required
  name: "Required",    // ← Required
  version: "1.0.0",    // ← Required
  description: "Optional but recommended",
  // ...
})
```

### Plugin Won't Enable

Check the browser console for errors. Common issues:

1. **Syntax error in plugin code** - Use browser dev tools to debug
2. **Missing `activate` function** - Add it even if empty
3. **Error in `activate`** - Add try/catch around your code

### Settings Not Working

Make sure you're accessing settings correctly:

```javascript
activate: function(settings) {
  // settings may be undefined on first run
  var value = (settings && settings.myKey) || defaultValue;
}
```

### CSS Variables Not Applying

1. Use `document.documentElement.style.setProperty()` not `document.body.style`
2. Include the `--` prefix: `"--background"` not `"background"`
3. Call `removeProperty()` in `deactivate()` to reset

### DOM Events Not Firing

1. Make sure you're listening to the correct event name (case-sensitive)
2. Store your handler reference for removal in `deactivate()`
3. Check that the event is actually being dispatched by the app

### Plugin Data Lost After Refresh

Plugins are stored in localStorage. If you're seeing data loss:

1. Check if localStorage is available
2. Don't exceed localStorage quota (~5MB)
3. Plugin code and settings are stored automatically

---

## API Reference

### pluginManager Methods

```typescript
// Install a new plugin
pluginManager.installPlugin(manifest, instance?, code?): Promise<boolean>

// Uninstall a plugin
pluginManager.uninstallPlugin(pluginId): Promise<boolean>

// Enable a plugin
pluginManager.enablePlugin(pluginId): Promise<boolean>

// Disable a plugin
pluginManager.disablePlugin(pluginId): Promise<boolean>

// Get plugin settings
pluginManager.getPluginSettings(pluginId): Record<string, any>

// Set a plugin setting
pluginManager.setPluginSetting(pluginId, key, value): void

// Get plugin source code
pluginManager.getPluginCode(pluginId): string | undefined

// Get all installed plugins
pluginManager.getInstalledPlugins(): InstalledPlugin[]
```

### Hook Functions

```typescript
// Add a filter
addFilter(hookName, callback, priority?): void

// Apply filters to a value
applyFilters(hookName, value, ...args): Promise<T>
applyFiltersSync(hookName, value, ...args): T

// Add an action
addAction(hookName, callback, priority?): void

// Trigger an action
doAction(hookName, ...args): Promise<void>
doActionSync(hookName, ...args): void

// Check for override
hasOverride(hookName): boolean

// Get override function
getOverride(hookName): Function | null
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-25 | Everything was made |

---

*For more examples, see the `/public/plugins/` directory in the gvidtech repository.*