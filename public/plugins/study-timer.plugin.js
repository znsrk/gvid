/**
 * Study Timer Plugin
 * Shows a floating timer tracking study session duration
 */
({
  id: "study-timer",
  name: "Study Timer",
  version: "2.1.0",
  description: "Displays a floating timer showing how long you've been studying.",
  author: "OqyPlus Team",
  
  settings: [
    {
      key: "showTimer",
      type: "boolean",
      label: "Show Floating Timer",
      description: "Display timer widget on screen",
      default: true
    },
    {
      key: "breakReminder",
      type: "boolean",
      label: "Break Reminders",
      description: "Remind you to take breaks every 25 minutes",
      default: true
    },
    {
      key: "position",
      type: "select",
      label: "Timer Position",
      description: "Where to show the timer",
      default: "bottom-right",
      options: [
        { value: "top-left", label: "Top Left" },
        { value: "top-right", label: "Top Right" },
        { value: "bottom-left", label: "Bottom Left" },
        { value: "bottom-right", label: "Bottom Right" }
      ]
    }
  ],
  
  _timerElement: null,
  _startTime: null,
  _intervalId: null,
  _breakIntervalId: null,
  
  _formatTime: function(ms) {
    var seconds = Math.floor(ms / 1000);
    var minutes = Math.floor(seconds / 60);
    var hours = Math.floor(minutes / 60);
    
    seconds = seconds % 60;
    minutes = minutes % 60;
    
    var pad = function(n) { return n < 10 ? "0" + n : n; };
    
    if (hours > 0) {
      return hours + ":" + pad(minutes) + ":" + pad(seconds);
    }
    return pad(minutes) + ":" + pad(seconds);
  },
  
  _createTimerWidget: function(position) {
    var el = document.createElement("div");
    el.id = "study-timer-widget";
    
    var positions = {
      "top-left": "top:20px;left:20px;",
      "top-right": "top:20px;right:20px;",
      "bottom-left": "bottom:20px;left:20px;",
      "bottom-right": "bottom:20px;right:20px;"
    };
    
    el.style.cssText = "position:fixed;" + (positions[position] || positions["bottom-right"]) + 
      "background:var(--surface, #fff);border:1px solid var(--border, #e5e5e5);border-radius:12px;padding:12px 16px;font-family:monospace;font-size:18px;font-weight:600;color:var(--text-primary, #0d0d0d);box-shadow:0 4px 12px rgba(0,0,0,0.1);z-index:9999;display:flex;align-items:center;gap:8px;";
    
    el.innerHTML = '<span style="font-size:16px;">⏱️</span><span id="study-timer-display">00:00</span>';
    
    document.body.appendChild(el);
    return el;
  },
  
  _showBreakReminder: function() {
    var toast = document.createElement("div");
    toast.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);color:#fff;padding:24px 32px;border-radius:16px;font-size:18px;font-weight:500;box-shadow:0 8px 32px rgba(0,0,0,0.2);z-index:10001;text-align:center;";
    toast.innerHTML = "☕ Time for a break!<br><span style='font-size:14px;opacity:0.9;'>You've been studying for 25 minutes</span>";
    document.body.appendChild(toast);
    
    setTimeout(function() {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 5000);
  },
  
  hooks: {},
  
  activate: function(settings) {
    var self = this;
    this._startTime = Date.now();
    
    // Create timer widget if enabled
    if (!settings || settings.showTimer !== false) {
      var position = (settings && settings.position) || "bottom-right";
      this._timerElement = this._createTimerWidget(position);
      
      // Update timer every second
      this._intervalId = setInterval(function() {
        var elapsed = Date.now() - self._startTime;
        var display = document.getElementById("study-timer-display");
        if (display) {
          display.textContent = self._formatTime(elapsed);
        }
      }, 1000);
    }
    
    // Set up break reminders
    if (!settings || settings.breakReminder !== false) {
      this._breakIntervalId = setInterval(function() {
        self._showBreakReminder();
      }, 25 * 60 * 1000); // 25 minutes
    }
    
    console.log("[Study Timer] Session started");
  },
  
  deactivate: function() {
    var duration = this._startTime ? Math.round((Date.now() - this._startTime) / 60000) : 0;
    
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    
    if (this._breakIntervalId) {
      clearInterval(this._breakIntervalId);
      this._breakIntervalId = null;
    }
    
    if (this._timerElement && this._timerElement.parentNode) {
      this._timerElement.parentNode.removeChild(this._timerElement);
      this._timerElement = null;
    }
    
    console.log("[Study Timer] Session ended. Total time: " + duration + " minutes");
  }
})
