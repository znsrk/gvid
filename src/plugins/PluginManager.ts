/**
 * OqyPlus Plugin System - Core Plugin Manager
 * 
 * This implements a WordPress-style hook system with:
 * - FILTERS: Modify data as it flows through the app (like WordPress add_filter/apply_filters)
 * - ACTIONS: Execute side effects at specific points (like WordPress add_action/do_action)
 * - OVERRIDES: Completely replace core functionality
 * 
 * Design Philosophy:
 * - Plugins can modify almost any behavior without changing core code
 * - Multiple plugins can hook into the same point (priority ordering)
 * - Plugins can be installed/uninstalled at runtime
 */

// ============ TYPE DEFINITIONS ============

export type FilterCallback<T = any> = (value: T, ...args: any[]) => T | Promise<T>;
export type ActionCallback = (...args: any[]) => void | Promise<void>;
export type OverrideCallback<T = any> = (...args: any[]) => T | Promise<T>;

interface HookEntry<T extends Function = Function> {
  callback: T;
  priority: number;
  pluginId: string;
}

interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  hooks?: {
    filters?: Record<string, { handler: string; priority?: number }>;
    actions?: Record<string, { handler: string; priority?: number }>;
    overrides?: Record<string, { handler: string }>;
  };
  settings?: PluginSetting[];
  initialize?: () => void | Promise<void>;
  cleanup?: () => void | Promise<void>;
}

interface PluginSetting {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  label: string;
  description?: string;
  default: any;
  options?: { value: any; label: string }[];
}

interface InstalledPlugin {
  manifest: PluginManifest;
  enabled: boolean;
  settings: Record<string, any>;
  instance?: any;
}

// ============ HOOK REGISTRY ============

class HookRegistry {
  private filters: Map<string, HookEntry<FilterCallback>[]> = new Map();
  private actions: Map<string, HookEntry<ActionCallback>[]> = new Map();
  private overrides: Map<string, HookEntry<OverrideCallback>> = new Map();
  
  // ---- FILTERS ----
  // Filters modify data as it passes through. Multiple filters can chain together.
  
  addFilter<T>(
    hookName: string, 
    callback: FilterCallback<T>, 
    priority: number = 10,
    pluginId: string = 'core'
  ): void {
    if (!this.filters.has(hookName)) {
      this.filters.set(hookName, []);
    }
    
    const hooks = this.filters.get(hookName)!;
    hooks.push({ callback, priority, pluginId });
    
    // Sort by priority (lower numbers run first, like WordPress)
    hooks.sort((a, b) => a.priority - b.priority);
  }
  
  removeFilter(hookName: string, pluginId: string): void {
    const hooks = this.filters.get(hookName);
    if (hooks) {
      this.filters.set(hookName, hooks.filter(h => h.pluginId !== pluginId));
    }
  }
  
  async applyFilters<T>(hookName: string, value: T, ...args: any[]): Promise<T> {
    const hooks = this.filters.get(hookName);
    if (!hooks || hooks.length === 0) return value;
    
    let result = value;
    for (const hook of hooks) {
      try {
        result = await hook.callback(result, ...args);
      } catch (error) {
        console.error(`Filter error in ${hookName} (plugin: ${hook.pluginId}):`, error);
      }
    }
    return result;
  }
  
  // Synchronous version for performance-critical paths
  applyFiltersSync<T>(hookName: string, value: T, ...args: any[]): T {
    const hooks = this.filters.get(hookName);
    if (!hooks || hooks.length === 0) return value;
    
    let result = value;
    for (const hook of hooks) {
      try {
        const output = hook.callback(result, ...args);
        // Only use sync results
        if (!(output instanceof Promise)) {
          result = output;
        }
      } catch (error) {
        console.error(`Filter error in ${hookName} (plugin: ${hook.pluginId}):`, error);
      }
    }
    return result;
  }
  
  // ---- ACTIONS ----
  // Actions trigger side effects. They don't return values.
  
  addAction(
    hookName: string, 
    callback: ActionCallback, 
    priority: number = 10,
    pluginId: string = 'core'
  ): void {
    if (!this.actions.has(hookName)) {
      this.actions.set(hookName, []);
    }
    
    const hooks = this.actions.get(hookName)!;
    hooks.push({ callback, priority, pluginId });
    hooks.sort((a, b) => a.priority - b.priority);
  }
  
  removeAction(hookName: string, pluginId: string): void {
    const hooks = this.actions.get(hookName);
    if (hooks) {
      this.actions.set(hookName, hooks.filter(h => h.pluginId !== pluginId));
    }
  }
  
  async doAction(hookName: string, ...args: any[]): Promise<void> {
    const hooks = this.actions.get(hookName);
    if (!hooks) return;
    
    for (const hook of hooks) {
      try {
        await hook.callback(...args);
      } catch (error) {
        console.error(`Action error in ${hookName} (plugin: ${hook.pluginId}):`, error);
      }
    }
  }
  
  // Synchronous version
  doActionSync(hookName: string, ...args: any[]): void {
    const hooks = this.actions.get(hookName);
    if (!hooks) return;
    
    for (const hook of hooks) {
      try {
        hook.callback(...args);
      } catch (error) {
        console.error(`Action error in ${hookName} (plugin: ${hook.pluginId}):`, error);
      }
    }
  }
  
  // ---- OVERRIDES ----
  // Overrides completely replace a function. Only one override can be active per hook.
  
  addOverride<T>(
    hookName: string, 
    callback: OverrideCallback<T>,
    pluginId: string
  ): boolean {
    // Check if already overridden by another plugin
    const existing = this.overrides.get(hookName);
    if (existing && existing.pluginId !== pluginId) {
      console.warn(`Override ${hookName} already claimed by ${existing.pluginId}`);
      return false;
    }
    
    this.overrides.set(hookName, { callback, priority: 0, pluginId });
    return true;
  }
  
  removeOverride(hookName: string, pluginId: string): void {
    const existing = this.overrides.get(hookName);
    if (existing && existing.pluginId === pluginId) {
      this.overrides.delete(hookName);
    }
  }
  
  getOverride<T>(hookName: string): OverrideCallback<T> | null {
    const entry = this.overrides.get(hookName);
    return entry ? entry.callback as OverrideCallback<T> : null;
  }
  
  hasOverride(hookName: string): boolean {
    return this.overrides.has(hookName);
  }
  
  // ---- UTILITIES ----
  
  removeAllForPlugin(pluginId: string): void {
    // Remove all filters
    for (const [hookName, hooks] of this.filters) {
      this.filters.set(hookName, hooks.filter(h => h.pluginId !== pluginId));
    }
    
    // Remove all actions
    for (const [hookName, hooks] of this.actions) {
      this.actions.set(hookName, hooks.filter(h => h.pluginId !== pluginId));
    }
    
    // Remove all overrides
    for (const [hookName, entry] of this.overrides) {
      if (entry.pluginId === pluginId) {
        this.overrides.delete(hookName);
      }
    }
  }
  
  getRegisteredHooks(): { filters: string[]; actions: string[]; overrides: string[] } {
    return {
      filters: Array.from(this.filters.keys()),
      actions: Array.from(this.actions.keys()),
      overrides: Array.from(this.overrides.keys())
    };
  }
}

// ============ PLUGIN MANAGER ============

const STORAGE_KEY = 'oqyplus_plugins';
const PLUGIN_CODE_KEY = 'oqyplus_plugin_code';

interface StoredPluginData {
  manifest: PluginManifest;
  enabled: boolean;
  settings: Record<string, any>;
}

class PluginManager {
  private registry: HookRegistry = new HookRegistry();
  private plugins: Map<string, InstalledPlugin> = new Map();
  private pluginCode: Map<string, string> = new Map(); // Store raw plugin code for reinstall
  private listeners: Set<() => void> = new Set();
  
  // Singleton instance
  private static instance: PluginManager | null = null;
  
  static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }
  
  constructor() {
    // Load plugins from localStorage on initialization
    this.loadFromStorage();
  }
  
  // ---- STORAGE ----
  
  private loadFromStorage(): void {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      const storedCode = localStorage.getItem(PLUGIN_CODE_KEY);
      
      if (storedData && storedCode) {
        const pluginsData: Record<string, StoredPluginData> = JSON.parse(storedData);
        const codeData: Record<string, string> = JSON.parse(storedCode);
        
        // Re-install each plugin from stored code
        for (const [pluginId, data] of Object.entries(pluginsData)) {
          const code = codeData[pluginId];
          if (code) {
            try {
              // Re-parse the plugin code
              const strippedCode = code.replace(/^[\s]*\/\*[\s\S]*?\*\/[\s]*/, '').replace(/^[\s]*\/\/.*\n/gm, '').trim();
              const pluginModule = new Function('return ' + strippedCode)();
              
              if (pluginModule && pluginModule.id) {
                // Create plugin instance
                const pluginInstance: any = {};
                if (pluginModule.hooks) {
                  for (const [hookName, handler] of Object.entries(pluginModule.hooks)) {
                    if (typeof handler === 'function') {
                      const wrappedHandler = (...args: any[]) => {
                        const currentSettings = this.getPluginSettings(pluginModule.id);
                        return (handler as Function)(...args, currentSettings);
                      };
                      pluginInstance[hookName] = wrappedHandler;
                    }
                  }
                }
                if (pluginModule.activate) {
                  pluginInstance.onEnable = () => {
                    const currentSettings = this.getPluginSettings(pluginModule.id);
                    pluginModule.activate(currentSettings);
                  };
                }
                if (pluginModule.deactivate) {
                  pluginInstance.onDisable = pluginModule.deactivate;
                }
                
                // Build manifest
                const manifest: PluginManifest = {
                  id: pluginModule.id,
                  name: pluginModule.name,
                  version: pluginModule.version,
                  description: pluginModule.description || '',
                  author: pluginModule.author || 'Unknown',
                  hooks: pluginModule.hooks ? {
                    filters: Object.keys(pluginModule.hooks).reduce((acc, key) => {
                      acc[key] = { handler: key, priority: 10 };
                      return acc;
                    }, {} as Record<string, { handler: string; priority: number }>)
                  } : undefined,
                  settings: pluginModule.settings || [],
                };
                
                // Restore settings from storage
                const restoredSettings = data.settings || {};
                if (manifest.settings) {
                  for (const setting of manifest.settings) {
                    if (!(setting.key in restoredSettings)) {
                      restoredSettings[setting.key] = setting.default;
                    }
                  }
                }
                
                // Add to plugins map (without triggering save)
                this.plugins.set(manifest.id, {
                  manifest,
                  enabled: false,
                  settings: restoredSettings,
                  instance: pluginInstance
                });
                this.pluginCode.set(manifest.id, code);
                
                // Enable if it was enabled before
                if (data.enabled) {
                  this.enablePlugin(manifest.id);
                }
                
                console.log(`[PluginManager] Restored plugin: ${manifest.name}`);
              }
            } catch (error) {
              console.error(`[PluginManager] Failed to restore plugin ${pluginId}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('[PluginManager] Failed to load plugins from storage:', error);
    }
  }
  
  private saveToStorage(): void {
    try {
      const pluginsData: Record<string, StoredPluginData> = {};
      const codeData: Record<string, string> = {};
      
      for (const [id, plugin] of this.plugins) {
        pluginsData[id] = {
          manifest: plugin.manifest,
          enabled: plugin.enabled,
          settings: plugin.settings
        };
        
        const code = this.pluginCode.get(id);
        if (code) {
          codeData[id] = code;
        }
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pluginsData));
      localStorage.setItem(PLUGIN_CODE_KEY, JSON.stringify(codeData));
    } catch (error) {
      console.error('[PluginManager] Failed to save plugins to storage:', error);
    }
  }
  
  // ---- PLUGIN LIFECYCLE ----
  
  async installPlugin(manifest: PluginManifest, pluginInstance?: any, pluginCode?: string): Promise<boolean> {
    if (this.plugins.has(manifest.id)) {
      console.warn(`Plugin ${manifest.id} is already installed`);
      return false;
    }
    
    // Initialize settings with defaults
    const settings: Record<string, any> = {};
    if (manifest.settings) {
      for (const setting of manifest.settings) {
        settings[setting.key] = setting.default;
      }
    }
    
    this.plugins.set(manifest.id, {
      manifest,
      enabled: false,
      settings,
      instance: pluginInstance
    });
    
    // Store the plugin code for persistence
    if (pluginCode) {
      this.pluginCode.set(manifest.id, pluginCode);
    }
    
    // Auto-enable if it has an initialize function
    if (manifest.initialize || pluginInstance) {
      await this.enablePlugin(manifest.id);
    }
    
    this.saveToStorage();
    this.notifyListeners();
    console.log(`Plugin installed: ${manifest.name} v${manifest.version}`);
    return true;
  }
  
  async uninstallPlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.warn(`Plugin ${pluginId} is not installed`);
      return false;
    }
    
    // Disable first
    await this.disablePlugin(pluginId);
    
    // Remove from registry
    this.plugins.delete(pluginId);
    this.pluginCode.delete(pluginId);
    
    this.saveToStorage();
    this.notifyListeners();
    console.log(`Plugin uninstalled: ${plugin.manifest.name}`);
    return true;
  }
  
  async enablePlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.warn(`Plugin ${pluginId} is not installed`);
      return false;
    }
    
    if (plugin.enabled) {
      return true;
    }
    
    try {
      // Register hooks from manifest
      if (plugin.manifest.hooks?.filters && plugin.instance) {
        for (const [hookName, config] of Object.entries(plugin.manifest.hooks.filters)) {
          const handler = plugin.instance[config.handler];
          if (typeof handler === 'function') {
            this.registry.addFilter(hookName, handler.bind(plugin.instance), config.priority || 10, pluginId);
          }
        }
      }
      
      if (plugin.manifest.hooks?.actions && plugin.instance) {
        for (const [hookName, config] of Object.entries(plugin.manifest.hooks.actions)) {
          const handler = plugin.instance[config.handler];
          if (typeof handler === 'function') {
            this.registry.addAction(hookName, handler.bind(plugin.instance), config.priority || 10, pluginId);
          }
        }
      }
      
      if (plugin.manifest.hooks?.overrides && plugin.instance) {
        for (const [hookName, config] of Object.entries(plugin.manifest.hooks.overrides)) {
          const handler = plugin.instance[config.handler];
          if (typeof handler === 'function') {
            this.registry.addOverride(hookName, handler.bind(plugin.instance), pluginId);
          }
        }
      }
      
      // Run initialization
      if (plugin.manifest.initialize) {
        await plugin.manifest.initialize();
      }
      if (plugin.instance?.onEnable) {
        await plugin.instance.onEnable();
      }
      
      plugin.enabled = true;
      this.saveToStorage();
      this.notifyListeners();
      console.log(`Plugin enabled: ${plugin.manifest.name}`);
      return true;
    } catch (error) {
      console.error(`Failed to enable plugin ${pluginId}:`, error);
      return false;
    }
  }
  
  async disablePlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !plugin.enabled) {
      return false;
    }
    
    try {
      // Run cleanup
      if (plugin.manifest.cleanup) {
        await plugin.manifest.cleanup();
      }
      if (plugin.instance?.onDisable) {
        await plugin.instance.onDisable();
      }
      
      // Remove all hooks for this plugin
      this.registry.removeAllForPlugin(pluginId);
      
      plugin.enabled = false;
      this.saveToStorage();
      this.notifyListeners();
      console.log(`Plugin disabled: ${plugin.manifest.name}`);
      return true;
    } catch (error) {
      console.error(`Failed to disable plugin ${pluginId}:`, error);
      return false;
    }
  }
  
  // ---- HOOK ACCESS ----
  
  addFilter<T>(hookName: string, callback: FilterCallback<T>, priority?: number): void {
    this.registry.addFilter(hookName, callback, priority, 'inline');
  }
  
  async applyFilters<T>(hookName: string, value: T, ...args: any[]): Promise<T> {
    return this.registry.applyFilters(hookName, value, ...args);
  }
  
  applyFiltersSync<T>(hookName: string, value: T, ...args: any[]): T {
    return this.registry.applyFiltersSync(hookName, value, ...args);
  }
  
  addAction(hookName: string, callback: ActionCallback, priority?: number): void {
    this.registry.addAction(hookName, callback, priority, 'inline');
  }
  
  async doAction(hookName: string, ...args: any[]): Promise<void> {
    return this.registry.doAction(hookName, ...args);
  }
  
  doActionSync(hookName: string, ...args: any[]): void {
    this.registry.doActionSync(hookName, ...args);
  }
  
  getOverride<T>(hookName: string): OverrideCallback<T> | null {
    return this.registry.getOverride(hookName);
  }
  
  hasOverride(hookName: string): boolean {
    return this.registry.hasOverride(hookName);
  }
  
  // ---- PLUGIN QUERIES ----
  
  getPlugin(pluginId: string): InstalledPlugin | undefined {
    return this.plugins.get(pluginId);
  }
  
  getInstalledPlugins(): InstalledPlugin[] {
    return Array.from(this.plugins.values());
  }
  
  getEnabledPlugins(): InstalledPlugin[] {
    return this.getInstalledPlugins().filter(p => p.enabled);
  }
  
  isPluginEnabled(pluginId: string): boolean {
    return this.plugins.get(pluginId)?.enabled || false;
  }
  
  // ---- PLUGIN CODE ----
  
  getPluginCode(pluginId: string): string | undefined {
    return this.pluginCode.get(pluginId);
  }
  
  // ---- SETTINGS ----
  
  getPluginSettings(pluginId: string): Record<string, any> | undefined {
    return this.plugins.get(pluginId)?.settings;
  }
  
  setPluginSetting(pluginId: string, key: string, value: any): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;
    
    plugin.settings[key] = value;
    
    // Notify plugin of setting change
    if (plugin.instance?.onSettingChange) {
      plugin.instance.onSettingChange(key, value);
    }
    
    this.saveToStorage();
    this.notifyListeners();
    return true;
  }
  
  // ---- STATE PERSISTENCE ----
  
  exportState(): string {
    const state: Record<string, { enabled: boolean; settings: Record<string, any> }> = {};
    for (const [id, plugin] of this.plugins) {
      state[id] = {
        enabled: plugin.enabled,
        settings: plugin.settings
      };
    }
    return JSON.stringify(state);
  }
  
  async importState(stateJson: string): Promise<void> {
    try {
      const state = JSON.parse(stateJson);
      for (const [id, data] of Object.entries(state as Record<string, any>)) {
        const plugin = this.plugins.get(id);
        if (plugin) {
          plugin.settings = data.settings || {};
          if (data.enabled && !plugin.enabled) {
            await this.enablePlugin(id);
          } else if (!data.enabled && plugin.enabled) {
            await this.disablePlugin(id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to import plugin state:', error);
    }
  }
  
  // ---- CHANGE LISTENERS ----
  
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
  
  // ---- DEBUG ----
  
  getRegisteredHooks() {
    return this.registry.getRegisteredHooks();
  }
}

// ============ EXPORTS ============

// Singleton instance
export const pluginManager = PluginManager.getInstance();

// Convenience functions (WordPress-style global functions)
export const addFilter = <T>(hookName: string, callback: FilterCallback<T>, priority?: number) => 
  pluginManager.addFilter(hookName, callback, priority);

export const applyFilters = <T>(hookName: string, value: T, ...args: any[]) => 
  pluginManager.applyFilters(hookName, value, ...args);

export const applyFiltersSync = <T>(hookName: string, value: T, ...args: any[]) => 
  pluginManager.applyFiltersSync(hookName, value, ...args);

export const addAction = (hookName: string, callback: ActionCallback, priority?: number) => 
  pluginManager.addAction(hookName, callback, priority);

export const doAction = (hookName: string, ...args: any[]) => 
  pluginManager.doAction(hookName, ...args);

export const doActionSync = (hookName: string, ...args: any[]) => 
  pluginManager.doActionSync(hookName, ...args);

export const getOverride = <T>(hookName: string) => 
  pluginManager.getOverride<T>(hookName);

export const hasOverride = (hookName: string) => 
  pluginManager.hasOverride(hookName);

export type { PluginManifest, PluginSetting, InstalledPlugin };
