/**
 * Sound Effects Plugin
 * Plays audio feedback for quiz answers and matching game
 */
({
  id: "sound-effects",
  name: "Sound Effects",
  version: "2.1.0",
  description: "Plays satisfying sounds for correct/incorrect answers and achievements.",
  author: "OqyPlus Team",
  
  settings: [
    {
      key: "volume",
      type: "number",
      label: "Volume (%)",
      description: "Sound effect volume (0-100)",
      default: 50
    },
    {
      key: "correctSound",
      type: "boolean",
      label: "Correct Answer Sound",
      description: "Play sound on correct answers",
      default: true
    },
    {
      key: "incorrectSound",
      type: "boolean",
      label: "Incorrect Answer Sound",
      description: "Play sound on incorrect answers",
      default: true
    }
  ],
  
  _audioContext: null,
  
  _getAudioContext: function() {
    if (!this._audioContext) {
      this._audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this._audioContext;
  },
  
  _playTone: function(frequency, duration, type, volume) {
    try {
      var ctx = this._getAudioContext();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.value = volume * 0.3;
      osc.frequency.value = frequency;
      osc.type = type || "sine";
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.log("[Sound Effects] Audio not available:", e.message);
    }
  },
  
  _playCorrect: function(volume) {
    var self = this;
    this._playTone(523.25, 0.1, "sine", volume);
    setTimeout(function() {
      self._playTone(659.25, 0.1, "sine", volume);
    }, 100);
    setTimeout(function() {
      self._playTone(783.99, 0.15, "sine", volume);
    }, 200);
  },
  
  _playIncorrect: function(volume) {
    this._playTone(200, 0.3, "square", volume * 0.5);
  },
  
  _playMatch: function(volume) {
    this._playTone(880, 0.1, "sine", volume);
  },
  
  hooks: {},
  
  activate: function(settings) {
    var self = this;
    
    // Store reference to plugin for action handlers
    window._soundEffectsPlugin = self;
    
    // Pre-initialize audio context on user interaction
    var initAudio = function() {
      if (!self._audioContext) {
        self._audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      document.removeEventListener("click", initAudio);
    };
    document.addEventListener("click", initAudio);
    
    // Listen for quiz answered events via custom event
    self._quizAnsweredHandler = function(e) {
      var data = e.detail;
      var vol = ((settings && settings.volume) || 50) / 100;
      var playCorrect = settings ? settings.correctSound !== false : true;
      var playIncorrect = settings ? settings.incorrectSound !== false : true;
      
      if (data && data.isCorrect && playCorrect) {
        self._playCorrect(vol);
      } else if (data && !data.isCorrect && playIncorrect) {
        self._playIncorrect(vol);
      }
    };
    
    self._matchFoundHandler = function(e) {
      var vol = ((settings && settings.volume) || 50) / 100;
      self._playMatch(vol);
    };
    
    // Listen for custom events dispatched by the app
    document.addEventListener("oqyplus:quiz:answered", self._quizAnsweredHandler);
    document.addEventListener("oqyplus:matching:matchFound", self._matchFoundHandler);
    
    console.log("[Sound Effects] Audio feedback enabled at " + ((settings && settings.volume) || 50) + "% volume");
  },
  
  deactivate: function() {
    var self = this;
    
    // Remove event listeners
    if (self._quizAnsweredHandler) {
      document.removeEventListener("oqyplus:quiz:answered", self._quizAnsweredHandler);
    }
    if (self._matchFoundHandler) {
      document.removeEventListener("oqyplus:matching:matchFound", self._matchFoundHandler);
    }
    
    if (self._audioContext) {
      self._audioContext.close();
      self._audioContext = null;
    }
    
    delete window._soundEffectsPlugin;
    
    console.log("[Sound Effects] Deactivated");
  }
})
