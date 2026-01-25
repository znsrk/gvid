/**
 * OqyPlus Plugin System
 * 
 * A WordPress-style plugin system for the OqyPlus learning platform.
 * 
 * USAGE:
 * 
 * 1. Creating a plugin:
 * ```typescript
 * import { pluginManager, PluginManifest } from './plugins';
 * 
 * const myPlugin = {
 *   manifest: {
 *     id: 'my-plugin',
 *     name: 'My Plugin',
 *     version: '1.0.0',
 *     description: 'Does something cool'
 *   },
 *   
 *   onEnable() {
 *     console.log('Plugin enabled!');
 *   },
 *   
 *   onDisable() {
 *     console.log('Plugin disabled!');
 *   },
 *   
 *   // Filter handler
 *   modifyQuizScore(score) {
 *     return { ...score, correct: score.correct + 1 }; // Give bonus point
 *   }
 * };
 * 
 * pluginManager.installPlugin(myPlugin.manifest, myPlugin);
 * ```
 * 
 * 2. Using filters inline:
 * ```typescript
 * import { addFilter, applyFilters } from './plugins';
 * 
 * // Add a filter
 * addFilter('quiz:calculateScore', (score) => {
 *   return { ...score, correct: score.correct + 1 };
 * }, 10); // priority 10
 * 
 * // Apply filters
 * const finalScore = await applyFilters('quiz:calculateScore', { correct: 5, total: 10 });
 * ```
 * 
 * 3. Using actions:
 * ```typescript
 * import { addAction, doAction } from './plugins';
 * 
 * // Listen for action
 * addAction('quiz:completed', (result) => {
 *   console.log(`Quiz finished! Score: ${result.score}/${result.total}`);
 *   // Send analytics, show celebration, etc.
 * });
 * 
 * // Trigger action (done in core code)
 * await doAction('quiz:completed', { score: 8, total: 10, passed: true });
 * ```
 * 
 * 4. Using in React components:
 * ```tsx
 * import { usePlugins, useFilter, useAction, useOverride } from './plugins';
 * 
 * function MyComponent() {
 *   const { plugins, enablePlugin } = usePlugins();
 *   const filteredData = useFilter('myHook', originalData);
 *   const { trigger } = useAction('myAction');
 *   const { hasOverride, override } = useOverride('render:MyComponent');
 *   
 *   if (hasOverride) {
 *     return override(props);
 *   }
 *   
 *   return <div>{filteredData}</div>;
 * }
 * ```
 */

// Core plugin manager
export { 
  pluginManager,
  addFilter,
  applyFilters,
  applyFiltersSync,
  addAction,
  doAction,
  doActionSync,
  getOverride,
  hasOverride
} from './PluginManager';

export type { 
  PluginManifest, 
  PluginSetting, 
  InstalledPlugin,
  FilterCallback,
  ActionCallback,
  OverrideCallback
} from './PluginManager';

// React integration
export { 
  PluginProvider,
  usePlugins,
  useFilter,
  useFilterSync,
  useAction,
  useOverride,
  withPluginOverride
} from './PluginContext';

// Hook definitions
export { 
  FILTER_HOOKS, 
  ACTION_HOOKS, 
  OVERRIDE_HOOKS 
} from './hooks';

export type { 
  FilterHooks, 
  ActionHooks, 
  OverrideHooks 
} from './hooks';
