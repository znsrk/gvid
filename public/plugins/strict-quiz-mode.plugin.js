/**
 * Strict Quiz Mode Plugin
 * Raises the quiz passing threshold for more challenging learning
 */
({
  id: "strict-quiz-mode",
  name: "Strict Quiz Mode",
  version: "2.1.0",
  description: "Raises quiz passing threshold for more challenging learning. Default 90%.",
  author: "OqyPlus Team",
  
  settings: [
    {
      key: "threshold",
      type: "number",
      label: "Pass Threshold (%)",
      description: "Minimum percentage required to pass a quiz (default: 90)",
      default: 90
    }
  ],
  
  hooks: {
    "quiz:passThreshold": function(threshold, settings) {
      var newThreshold = (settings && settings.threshold) ? settings.threshold / 100 : 0.9;
      console.log("[Strict Quiz Mode] Pass threshold changed from " + (threshold * 100) + "% to " + (newThreshold * 100) + "%");
      return newThreshold;
    }
  },
  
  activate: function(settings) {
    var threshold = (settings && settings.threshold) || 90;
    console.log("[Strict Quiz Mode] Activated with " + threshold + "% threshold");
  },
  
  deactivate: function() {
    console.log("[Strict Quiz Mode] Deactivated - threshold reset to default 70%");
  }
})
