/**
 * OqyPlus Plugin System - React Context Provider
 * 
 * Provides React components access to the plugin system.
 * This enables:
 * - Components to check for overrides
 * - Components to apply filters to their data
 * - Components to trigger actions
 * - Re-rendering when plugins change
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { 
  pluginManager, 
  PluginManifest, 
  InstalledPlugin,
  FilterCallback,
  ActionCallback
} from './PluginManager';

// ============ CONTEXT TYPE ============

interface PluginContextType {
  // Plugin management
  plugins: InstalledPlugin[];
  enabledPlugins: InstalledPlugin[];
  installPlugin: (manifest: PluginManifest, instance?: any) => Promise<boolean>;
  uninstallPlugin: (pluginId: string) => Promise<boolean>;
  enablePlugin: (pluginId: string) => Promise<boolean>;
  disablePlugin: (pluginId: string) => Promise<boolean>;
  isPluginEnabled: (pluginId: string) => boolean;
  
  // Settings
  getPluginSettings: (pluginId: string) => Record<string, any> | undefined;
  setPluginSetting: (pluginId: string, key: string, value: any) => boolean;
  
  // Hooks
  applyFilters: <T>(hookName: string, value: T, ...args: any[]) => Promise<T>;
  applyFiltersSync: <T>(hookName: string, value: T, ...args: any[]) => T;
  doAction: (hookName: string, ...args: any[]) => Promise<void>;
  doActionSync: (hookName: string, ...args: any[]) => void;
  hasOverride: (hookName: string) => boolean;
  getOverride: <T>(hookName: string) => (((...args: any[]) => T | Promise<T>) | null);
  
  // Debug
  getRegisteredHooks: () => { filters: string[]; actions: string[]; overrides: string[] };
}

// ============ CONTEXT ============

const PluginContext = createContext<PluginContextType | null>(null);

// ============ PROVIDER ============

interface PluginProviderProps {
  children: ReactNode;
}

export const PluginProvider: React.FC<PluginProviderProps> = ({ children }) => {
  const [plugins, setPlugins] = useState<InstalledPlugin[]>([]);
  
  // Subscribe to plugin changes
  useEffect(() => {
    const updatePlugins = () => {
      setPlugins(pluginManager.getInstalledPlugins());
    };
    
    // Initial load
    updatePlugins();
    
    // Subscribe to changes
    const unsubscribe = pluginManager.subscribe(updatePlugins);
    
    // Trigger app:init action
    pluginManager.doAction('app:init');
    
    return () => {
      unsubscribe();
      pluginManager.doAction('app:shutdown');
    };
  }, []);
  
  const enabledPlugins = plugins.filter(p => p.enabled);
  
  const contextValue: PluginContextType = {
    plugins,
    enabledPlugins,
    
    installPlugin: useCallback(async (manifest, instance) => {
      return pluginManager.installPlugin(manifest, instance);
    }, []),
    
    uninstallPlugin: useCallback(async (pluginId) => {
      return pluginManager.uninstallPlugin(pluginId);
    }, []),
    
    enablePlugin: useCallback(async (pluginId) => {
      return pluginManager.enablePlugin(pluginId);
    }, []),
    
    disablePlugin: useCallback(async (pluginId) => {
      return pluginManager.disablePlugin(pluginId);
    }, []),
    
    isPluginEnabled: useCallback((pluginId) => {
      return pluginManager.isPluginEnabled(pluginId);
    }, []),
    
    getPluginSettings: useCallback((pluginId) => {
      return pluginManager.getPluginSettings(pluginId);
    }, []),
    
    setPluginSetting: useCallback((pluginId, key, value) => {
      return pluginManager.setPluginSetting(pluginId, key, value);
    }, []),
    
    applyFilters: useCallback(async <T,>(hookName: string, value: T, ...args: any[]) => {
      return pluginManager.applyFilters(hookName, value, ...args);
    }, []),
    
    applyFiltersSync: useCallback(<T,>(hookName: string, value: T, ...args: any[]) => {
      return pluginManager.applyFiltersSync(hookName, value, ...args);
    }, []),
    
    doAction: useCallback(async (hookName: string, ...args: any[]) => {
      return pluginManager.doAction(hookName, ...args);
    }, []),
    
    doActionSync: useCallback((hookName: string, ...args: any[]) => {
      return pluginManager.doActionSync(hookName, ...args);
    }, []),
    
    hasOverride: useCallback((hookName: string) => {
      return pluginManager.hasOverride(hookName);
    }, []),
    
    getOverride: useCallback(<T,>(hookName: string) => {
      return pluginManager.getOverride<T>(hookName);
    }, []),
    
    getRegisteredHooks: useCallback(() => {
      return pluginManager.getRegisteredHooks();
    }, []),
  };
  
  return (
    <PluginContext.Provider value={contextValue}>
      {children}
    </PluginContext.Provider>
  );
};

// ============ HOOK ============

export function usePlugins(): PluginContextType {
  const context = useContext(PluginContext);
  if (!context) {
    throw new Error('usePlugins must be used within a PluginProvider');
  }
  return context;
}

// ============ UTILITY HOOKS ============

/**
 * Hook to use a filter on data
 * Re-runs when dependencies change
 */
export function useFilter<T>(
  hookName: string, 
  value: T, 
  deps: any[] = []
): T {
  const [filteredValue, setFilteredValue] = useState<T>(value);
  const { applyFilters } = usePlugins();
  
  useEffect(() => {
    let mounted = true;
    
    applyFilters(hookName, value).then(result => {
      if (mounted) {
        setFilteredValue(result);
      }
    });
    
    return () => { mounted = false; };
  }, [hookName, value, ...deps]);
  
  return filteredValue;
}

/**
 * Hook to use a sync filter
 */
export function useFilterSync<T>(
  hookName: string, 
  value: T
): T {
  const { applyFiltersSync } = usePlugins();
  return applyFiltersSync(hookName, value);
}

/**
 * Hook to trigger an action
 */
export function useAction(hookName: string) {
  const { doAction, doActionSync } = usePlugins();
  
  return {
    trigger: useCallback((...args: any[]) => doAction(hookName, ...args), [hookName, doAction]),
    triggerSync: useCallback((...args: any[]) => doActionSync(hookName, ...args), [hookName, doActionSync]),
  };
}

/**
 * Hook to check if a component has an override
 */
export function useOverride<T>(hookName: string): {
  hasOverride: boolean;
  override: ((...args: any[]) => T | Promise<T>) | null;
} {
  const { hasOverride, getOverride } = usePlugins();
  
  return {
    hasOverride: hasOverride(hookName),
    override: getOverride<T>(hookName),
  };
}

/**
 * HOC to wrap a component with override support
 */
export function withPluginOverride<P extends object>(
  Component: React.ComponentType<P>,
  hookName: string
): React.FC<P> {
  return function OverridableComponent(props: P) {
    const { hasOverride, getOverride } = usePlugins();
    
    if (hasOverride(hookName)) {
      const override = getOverride<React.ReactNode>(hookName);
      if (override) {
        const result = override(props);
        if (result instanceof Promise) {
          // Handle async overrides with Suspense
          throw result;
        }
        return <>{result}</>;
      }
    }
    
    return <Component {...props} />;
  };
}
