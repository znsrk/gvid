import React, { useState, useEffect, useRef } from 'react';
import { usePlugins } from '../plugins';
import { pluginManager, PluginManifest } from '../plugins/PluginManager';
import { apiPost } from '../lib/fetch';

interface PluginManagerPageProps {
  onBack: () => void;
}

// Available plugins that can be downloaded (only plugins that exist in /plugins folder)
const AVAILABLE_PLUGINS = [
  {
    id: 'dark-mode-enhanced',
    name: 'Custom Color Themes',
    version: '2.1.0',
    description: 'Apply beautiful dark color themes with comprehensive styling for all UI elements.',
    author: 'gvidtech Team',
    file: '/plugins/dark-mode-enhanced.plugin.js',
    icon: '🎨'
  }
];

const PluginManagerPage: React.FC<PluginManagerPageProps> = ({ onBack }) => {
  const { plugins, enablePlugin, disablePlugin, uninstallPlugin } = usePlugins();
  const [installError, setInstallError] = useState<string | null>(null);
  const [installSuccess, setInstallSuccess] = useState<string | null>(null);
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null);
  const [pluginSettings, setPluginSettings] = useState<Record<string, any>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isInstalling, setIsInstalling] = useState<string | null>(null);
  const [editingPlugin, setEditingPlugin] = useState<string | null>(null);
  const [editorCode, setEditorCode] = useState<string>('');
  const [editorError, setEditorError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [settingsChanged, setSettingsChanged] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Load plugin settings when a plugin is selected
  useEffect(() => {
    if (selectedPlugin) {
      const plugin = plugins.find(p => p?.manifest?.id === selectedPlugin);
      if (plugin) {
        const settings: Record<string, any> = {};
        plugin.manifest.settings?.forEach(setting => {
          settings[setting.key] = pluginManager.getPluginSettings(plugin.manifest.id)?.[setting.key] ?? setting.default;
        });
        setPluginSettings(settings);
      }
    }
  }, [selectedPlugin, plugins]);

  const installPluginFromCode = async (code: string, skipExistCheck: boolean = false) => {
    try {
      // Parse the plugin code - expecting a JS expression that returns an object
      // Strip leading comments to avoid ASI issues with 'return' + newline + comment
      const strippedCode = code.replace(/^[\s]*\/\*[\s\S]*?\*\/[\s]*/, '').replace(/^[\s]*\/\/.*\n/gm, '').trim();
      
      const pluginModule = new Function('return ' + strippedCode)();
      
      if (!pluginModule || !pluginModule.id || !pluginModule.name || !pluginModule.version) {
        throw new Error('Plugin must have id, name, and version');
      }

      // Check if already installed (skip for edit operations)
      if (!skipExistCheck && plugins.find(p => p?.manifest?.id === pluginModule.id)) {
        throw new Error(`Plugin "${pluginModule.name}" is already installed`);
      }

      // Create a plugin instance with hooks as methods
      const pluginInstance: any = {};
      if (pluginModule.hooks) {
        for (const [hookName, handler] of Object.entries(pluginModule.hooks)) {
          if (typeof handler === 'function') {
            // Wrap the handler to pass settings
            const wrappedHandler = (...args: any[]) => {
              const currentSettings = pluginManager.getPluginSettings(pluginModule.id);
              return (handler as Function)(...args, currentSettings);
            };
            pluginInstance[hookName] = wrappedHandler;
          }
        }
      }
      
      // Add lifecycle methods
      if (pluginModule.activate) {
        pluginInstance.onEnable = () => {
          const currentSettings = pluginManager.getPluginSettings(pluginModule.id);
          pluginModule.activate(currentSettings);
        };
      }
      if (pluginModule.deactivate) {
        pluginInstance.onDisable = pluginModule.deactivate;
      }

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

      // Pass the raw code for persistence
      await pluginManager.installPlugin(manifest, pluginInstance, code);
      return manifest;
    } catch (error) {
      throw error;
    }
  };

  const handleFileUpload = async (file: File) => {
    setInstallError(null);
    setInstallSuccess(null);
    setIsInstalling('file');

    try {
      if (!file.name.endsWith('.js') && !file.name.endsWith('.plugin.js')) {
        throw new Error('Please upload a .js or .plugin.js file');
      }

      const code = await file.text();
      const manifest = await installPluginFromCode(code);
      setInstallSuccess(`Successfully installed "${manifest.name}" v${manifest.version}`);
      // Reload page after a short delay to show success message
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      setInstallError(error instanceof Error ? error.message : 'Failed to install plugin');
    } finally {
      setIsInstalling(null);
    }
  };

  const handleInstallFromUrl = async (url: string, pluginId: string, pluginName: string) => {
    setInstallError(null);
    setInstallSuccess(null);
    setIsInstalling(pluginId);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to download plugin');
      
      const code = await response.text();
      const manifest = await installPluginFromCode(code);
      setInstallSuccess(`Successfully installed "${manifest.name}" v${manifest.version}`);
      // Reload page after a short delay to show success message
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      setInstallError(error instanceof Error ? error.message : `Failed to install ${pluginName}`);
    } finally {
      setIsInstalling(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0]);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpdateSetting = (pluginId: string, key: string, value: any) => {
    pluginManager.setPluginSetting(pluginId, key, value);
    setPluginSettings(prev => ({ ...prev, [key]: value }));
    setSettingsChanged(true);
  };

  // Open the plugin code editor
  const handleOpenEditor = (pluginId: string) => {
    const code = pluginManager.getPluginCode(pluginId);
    if (code) {
      setEditorCode(code);
      setEditingPlugin(pluginId);
      setEditorError(null);
    } else {
      setInstallError('Could not load plugin source code');
    }
  };

  // Validate plugin code without installing
  const validatePluginCode = (code: string): { valid: boolean; error?: string } => {
    try {
      const strippedCode = code.replace(/^[\s]*\/\*[\s\S]*?\*\/[\s]*/, '').replace(/^[\s]*\/\/.*\n/gm, '').trim();
      const pluginModule = new Function('return ' + strippedCode)();
      
      if (!pluginModule || !pluginModule.id || !pluginModule.name || !pluginModule.version) {
        return { valid: false, error: 'Plugin must have id, name, and version' };
      }
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : 'Invalid JavaScript syntax' };
    }
  };

  // Save edited plugin code
  const handleSavePlugin = async () => {
    if (!editingPlugin) return;
    
    setIsSaving(true);
    setEditorError(null);
    
    try {
      // Validate the code first
      const validation = validatePluginCode(editorCode);
      if (!validation.valid) {
        setEditorError(validation.error || 'Invalid plugin code');
        setIsSaving(false);
        return;
      }

      // Get the old plugin data
      const oldPlugin = validPlugins.find(p => p.manifest.id === editingPlugin);
      const wasEnabled = oldPlugin?.enabled || false;

      // Uninstall the old version
      await uninstallPlugin(editingPlugin);

      // Install the new version (skip exist check since we just uninstalled)
      const manifest = await installPluginFromCode(editorCode, true);

      // Re-enable if it was enabled before
      if (wasEnabled) {
        await enablePlugin(manifest.id);
      }

      setInstallSuccess(`Plugin "${manifest.name}" updated successfully`);
      setEditingPlugin(null);
      setEditorCode('');
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : 'Failed to save plugin');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle keyboard shortcuts in editor
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab key inserts spaces instead of changing focus
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newValue = editorCode.substring(0, start) + '  ' + editorCode.substring(end);
      setEditorCode(newValue);
      // Set cursor position after inserted spaces
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
    // Ctrl+S to save
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSavePlugin();
    }
    // Escape to close
    if (e.key === 'Escape') {
      setEditingPlugin(null);
      setShowAiPanel(false);
    }
  };

  // AI Assist handler - calls the AI API to modify plugin code
  const handleAiAssist = async () => {
    if (!aiPrompt.trim() || isAiProcessing) return;
    await handleAiAssistWithPrompt(aiPrompt);
  };

  // AI Assist with direct prompt (for quick actions)
  const handleAiAssistWithPrompt = async (prompt: string) => {
    if (!prompt.trim() || isAiProcessing) return;
    
    setIsAiProcessing(true);
    setEditorError(null);
    
    try {
      const response = await apiPost('/modify-plugin-code', {
        code: editorCode,
        prompt: prompt
      });

      // Check if we got HTML instead of JSON (server not running)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server not responding. Make sure the backend server is running on port 3001.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to modify code');
      }
      
      if (data.code) {
        setEditorCode(data.code);
        setAiPrompt('');
      } else {
        throw new Error('No code returned from AI');
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setEditorError('AI assist failed: Cannot connect to server. Make sure the backend is running.');
      } else {
        setEditorError('AI assist failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Filter out undefined plugins and create a map
  const validPlugins = plugins.filter(p => p && p.manifest && p.manifest.id);
  const installedPluginIds = new Set(validPlugins.map(p => p.manifest.id));
  const selectedPluginData = validPlugins.find(p => p.manifest.id === selectedPlugin);

  // Helper to check if a plugin is installed
  const isPluginInstalled = (pluginId: string) => installedPluginIds.has(pluginId);
  const getInstalledPlugin = (pluginId: string) => validPlugins.find(p => p.manifest.id === pluginId);

  return (
    <div className="plugin-manager-page">
      <div className="plugin-header">
        <button className="back-btn" onClick={onBack}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div className="plugin-header-content">
          <h1>Plugin Manager</h1>
          <p className="plugin-header-subtitle">Extend gvidtech with powerful plugins</p>
        </div>
        <div className="plugin-stats">
          <div className="stat-item">
            <span className="stat-number">{validPlugins.length}</span>
            <span className="stat-label">Installed</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{validPlugins.filter(p => p.enabled).length}</span>
            <span className="stat-label">Active</span>
          </div>
        </div>
      </div>

      {/* Feedback Messages */}
      {(installError || installSuccess) && (
        <div className={`plugin-feedback ${installError ? 'error' : 'success'}`}>
          <span className="feedback-icon">{installError ? '⚠️' : '✅'}</span>
          <span>{installError || installSuccess}</span>
          <button className="feedback-close" onClick={() => { setInstallError(null); setInstallSuccess(null); }}>×</button>
        </div>
      )}

      <div className="plugin-content">
        {/* Hidden file input for upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept=".js,.plugin.js"
          style={{ display: 'none' }}
        />

        {/* Plugin Library Section - All plugins in one grid */}
        <section className="plugin-section">
          <div className="section-header">
            <h2>📦 Plugin Library</h2>
            <p>Browse, install, and manage your plugins</p>
          </div>
          <div className="plugins-grid">
            {/* Upload Card - First */}
            <div 
              className={`plugin-card upload-card ${isDragging ? 'dragging' : ''} ${isInstalling === 'file' ? 'installing' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isInstalling && fileInputRef.current?.click()}
            >
              <div className="plugin-card-top">
                <div className="plugin-icon">
                  {isInstalling === 'file' ? (
                    <div className="upload-spinner-small"></div>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  )}
                </div>
              </div>
              <div className="plugin-card-body">
                <h3 className="plugin-name">{isInstalling === 'file' ? 'Installing...' : 'Upload Plugin'}</h3>
                <p className="plugin-desc">{isDragging ? 'Drop your plugin here!' : 'Click or drag & drop a .plugin.js file'}</p>
              </div>
              <div className="plugin-card-footer">
                <span className="plugin-meta">.plugin.js</span>
                <div className="plugin-actions">
                  <span className="upload-hint-badge">Custom</span>
                </div>
              </div>
            </div>

            {/* Custom/User-Uploaded Plugins - Second (highest priority) */}
            {validPlugins
              .filter(p => !AVAILABLE_PLUGINS.find(ap => ap.id === p.manifest.id))
              .map(plugin => (
                <div 
                  key={plugin.manifest.id} 
                  className={`plugin-card installed custom`}
                  onClick={() => setSelectedPlugin(selectedPlugin === plugin.manifest.id ? null : plugin.manifest.id)}
                >
                  <div className="plugin-card-top">
                    <div className="plugin-icon">🔧</div>
                    <span className={`status-badge ${plugin.enabled ? 'enabled' : 'disabled'}`}>
                      {plugin.enabled ? '✓ Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="plugin-card-body">
                    <h3 className="plugin-name">{plugin.manifest.name}</h3>
                    <p className="plugin-desc">{plugin.manifest.description || 'No description provided'}</p>
                  </div>
                  <div className="plugin-card-footer">
                    <span className="plugin-meta">v{plugin.manifest.version} • Custom</span>
                    <div className="plugin-actions" onClick={e => e.stopPropagation()}>
                      {/* Settings button */}
                      <button
                        className="action-btn icon-btn"
                        onClick={() => setSelectedPlugin(selectedPlugin === plugin.manifest.id ? null : plugin.manifest.id)}
                        title="Plugin settings"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="3"/>
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                        </svg>
                      </button>
                      {/* Edit button */}
                      <button
                        className="action-btn icon-btn"
                        onClick={() => handleOpenEditor(plugin.manifest.id)}
                        title="Edit plugin code"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                        </svg>
                      </button>
                      <button
                        className={`action-btn ${plugin.enabled ? 'secondary' : 'primary'}`}
                        onClick={async () => {
                          if (plugin.enabled) {
                            await disablePlugin(plugin.manifest.id);
                          } else {
                            await enablePlugin(plugin.manifest.id);
                          }
                          window.location.href = '/';
                        }}
                      >
                        {plugin.enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        className="action-btn danger"
                        onClick={() => {
                          if (confirm(`Uninstall "${plugin.manifest.name}"?`)) {
                            uninstallPlugin(plugin.manifest.id);
                            if (selectedPlugin === plugin.manifest.id) {
                              setSelectedPlugin(null);
                            }
                          }
                        }}
                        title="Uninstall"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            }

            {/* Available Plugins from Library - Third */}
            {AVAILABLE_PLUGINS.map(plugin => {
              const installed = isPluginInstalled(plugin.id);
              const installedData = getInstalledPlugin(plugin.id);
              const isCurrentlyInstalling = isInstalling === plugin.id;
              
              return (
                <div 
                  key={plugin.id} 
                  className={`plugin-card ${installed ? 'installed' : ''}`}
                  onClick={() => installed && setSelectedPlugin(selectedPlugin === plugin.id ? null : plugin.id)}
                >
                  <div className="plugin-card-top">
                    <div className="plugin-icon">{plugin.icon}</div>
                    {installed && (
                      <span className={`status-badge ${installedData?.enabled ? 'enabled' : 'disabled'}`}>
                        {installedData?.enabled ? '✓ Active' : 'Inactive'}
                      </span>
                    )}
                  </div>
                  <div className="plugin-card-body">
                    <h3 className="plugin-name">{plugin.name}</h3>
                    <p className="plugin-desc">{plugin.description}</p>
                  </div>
                  <div className="plugin-card-footer">
                    <span className="plugin-meta">v{plugin.version}</span>
                    <div className="plugin-actions" onClick={e => e.stopPropagation()}>
                      {installed ? (
                        <>
                          {/* Settings button - gear icon */}
                          <button
                            className="action-btn icon-btn"
                            onClick={() => setSelectedPlugin(selectedPlugin === plugin.id ? null : plugin.id)}
                            title="Plugin settings"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="3"/>
                              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                            </svg>
                          </button>
                          {/* Edit button - wrench icon */}
                          <button
                            className="action-btn icon-btn"
                            onClick={() => handleOpenEditor(plugin.id)}
                            title="Edit plugin code"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                            </svg>
                          </button>
                          <button
                            className={`action-btn ${installedData?.enabled ? 'secondary' : 'primary'}`}
                            onClick={async () => {
                              if (installedData?.enabled) {
                                await disablePlugin(plugin.id);
                              } else {
                                await enablePlugin(plugin.id);
                              }
                              // Reload to apply plugin changes
                              window.location.href = '/';
                            }}
                          >
                            {installedData?.enabled ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            className="action-btn danger"
                            onClick={() => {
                              if (confirm(`Uninstall "${plugin.name}"?`)) {
                                uninstallPlugin(plugin.id);
                                if (selectedPlugin === plugin.id) {
                                  setSelectedPlugin(null);
                                }
                              }
                            }}
                            title="Uninstall"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                          </button>
                        </>
                      ) : (
                        <button
                          className="action-btn primary"
                          onClick={() => handleInstallFromUrl(plugin.file, plugin.id, plugin.name)}
                          disabled={isCurrentlyInstalling}
                        >
                          {isCurrentlyInstalling ? 'Installing...' : 'Install'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Plugin Settings Modal Overlay */}
        {selectedPluginData && (
          <div className="settings-modal-overlay" onClick={() => setSelectedPlugin(null)}>
            <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
              <div className="settings-modal-header">
                <div className="settings-title">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                  <h2>Settings: {selectedPluginData.manifest.name}</h2>
                </div>
                <button className="settings-close-btn" onClick={() => setSelectedPlugin(null)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="settings-modal-body">
                {selectedPluginData.manifest.settings && selectedPluginData.manifest.settings.length > 0 ? (
                  <div className="settings-list">
                    {selectedPluginData.manifest.settings.map(setting => (
                      <div key={setting.key} className="setting-row">
                        <div className="setting-info">
                          <label className="setting-label">{setting.label}</label>
                          {setting.description && (
                            <p className="setting-desc">{setting.description}</p>
                          )}
                        </div>
                        <div className="setting-control">
                          {setting.type === 'boolean' ? (
                            <label className="toggle">
                              <input
                                type="checkbox"
                                checked={pluginSettings[setting.key] ?? setting.default}
                                onChange={(e) => handleUpdateSetting(
                                  selectedPluginData.manifest.id,
                                  setting.key,
                                  e.target.checked
                                )}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          ) : setting.type === 'select' && setting.options ? (
                            <select
                              value={pluginSettings[setting.key] ?? setting.default}
                              onChange={(e) => handleUpdateSetting(
                                selectedPluginData.manifest.id,
                                setting.key,
                                e.target.value
                              )}
                              className="setting-select"
                            >
                              {setting.options.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          ) : setting.type === 'number' ? (
                            <input
                              type="number"
                              value={pluginSettings[setting.key] ?? setting.default}
                              onChange={(e) => handleUpdateSetting(
                                selectedPluginData.manifest.id,
                                setting.key,
                                Number(e.target.value)
                              )}
                              className="setting-input"
                            />
                          ) : (
                            <input
                              type="text"
                              value={pluginSettings[setting.key] ?? setting.default}
                              onChange={(e) => handleUpdateSetting(
                                selectedPluginData.manifest.id,
                                setting.key,
                                e.target.value
                              )}
                              className="setting-input"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-settings">This plugin has no configurable settings.</p>
                )}
              </div>
              <div className="settings-modal-footer">
                <button 
                  className="settings-done-btn" 
                  onClick={() => {
                    setSelectedPlugin(null);
                    if (settingsChanged) {
                      setSettingsChanged(false);
                      window.location.reload();
                    }
                  }}
                >
                  {settingsChanged ? 'Save & Reload' : 'Done'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Plugin Code Editor Modal */}
      {editingPlugin && (
        <div className="plugin-editor-overlay">
          <div className="plugin-editor-modal">
            <div className="editor-header">
              <div className="editor-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="16 18 22 12 16 6"/>
                  <polyline points="8 6 2 12 8 18"/>
                </svg>
                <h2>Edit Plugin: {validPlugins.find(p => p.manifest.id === editingPlugin)?.manifest.name}</h2>
              </div>
              <div className="editor-actions">
                <button
                  className={`editor-btn ai-btn ${showAiPanel ? 'active' : ''}`}
                  onClick={() => setShowAiPanel(!showAiPanel)}
                  title="AI Assist"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                    <circle cx="7.5" cy="14.5" r="1.5"/>
                    <circle cx="16.5" cy="14.5" r="1.5"/>
                  </svg>
                  AI
                </button>
                <span className="editor-hint">Ctrl+S to save</span>
                <button 
                  className="editor-btn secondary"
                  onClick={() => {
                    setEditingPlugin(null);
                    setShowAiPanel(false);
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="editor-btn primary"
                  onClick={handleSavePlugin}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
            
            {editorError && (
              <div className="editor-error">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{editorError}</span>
              </div>
            )}

            {/* AI Assist Panel */}
            {showAiPanel && (
              <div className="ai-assist-panel">
                <div className="ai-assist-header">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                    <circle cx="7.5" cy="14.5" r="1.5"/>
                    <circle cx="16.5" cy="14.5" r="1.5"/>
                  </svg>
                  <span>AI Code Assistant</span>
                  <button className="ai-close-btn" onClick={() => setShowAiPanel(false)}>×</button>
                </div>
                <div className="ai-assist-body">
                  <div className="ai-quick-actions">
                    <button 
                      onClick={async () => {
                        setAiPrompt('Bump the version number by incrementing the patch version');
                        await handleAiAssistWithPrompt('Bump the version number by incrementing the patch version');
                      }}
                      disabled={isAiProcessing}
                    >
                      {isAiProcessing ? '...' : 'Bump Version'}
                    </button>
                    <button 
                      onClick={async () => {
                        setAiPrompt('Format and clean up the code with proper indentation');
                        await handleAiAssistWithPrompt('Format and clean up the code with proper indentation');
                      }}
                      disabled={isAiProcessing}
                    >
                      {isAiProcessing ? '...' : 'Format Code'}
                    </button>
                    <button 
                      onClick={async () => {
                        setAiPrompt('Add a debug console.log statement in the activate function');
                        await handleAiAssistWithPrompt('Add a debug console.log statement in the activate function');
                      }}
                      disabled={isAiProcessing}
                    >
                      {isAiProcessing ? '...' : 'Add Debug Log'}
                    </button>
                  </div>
                  <div className="ai-input-row">
                    <input
                      type="text"
                      className="ai-input"
                      placeholder="Describe what you want to change..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAiAssist();
                        }
                      }}
                      disabled={isAiProcessing}
                    />
                    <button 
                      className="ai-submit-btn"
                      onClick={handleAiAssist}
                      disabled={isAiProcessing || !aiPrompt.trim()}
                    >
                      {isAiProcessing ? '...' : '→'}
                    </button>
                  </div>
                  <p className="ai-help-text">Try: "add a new boolean setting", "change description to...", "add filter for quiz results"</p>
                </div>
              </div>
            )}
            
            <div className="editor-body">
              <textarea
                ref={editorRef}
                className="code-editor"
                value={editorCode}
                onChange={(e) => setEditorCode(e.target.value)}
                onKeyDown={handleEditorKeyDown}
                spellCheck={false}
                placeholder="// Plugin code goes here..."
              />
            </div>
            
            <div className="editor-footer">
              <div className="editor-stats">
                <span>{editorCode.split('\n').length} lines</span>
                <span>{editorCode.length} characters</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .plugin-manager-page {
          padding: 24px 32px;
          height: 100%;
          overflow-y: auto;
          background: var(--background);
        }

        .plugin-header {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 28px;
          padding: 24px 28px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
        }

        .back-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--surface);
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .back-btn:hover {
          background: var(--surface-secondary);
          border-color: var(--primary);
        }

        .plugin-header-content {
          flex: 1;
        }

        .plugin-header-content h1 {
          margin: 0;
          font-size: 26px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .plugin-header-subtitle {
          margin: 6px 0 0;
          color: var(--text-secondary);
          font-size: 15px;
        }

        .plugin-stats {
          display: flex;
          gap: 12px;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 14px 24px;
          background: var(--surface-secondary);
          border-radius: 12px;
          min-width: 80px;
        }

        .stat-number {
          font-size: 28px;
          font-weight: 700;
          color: var(--primary);
        }

        .stat-label {
          font-size: 11px;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 2px;
        }

        /* Feedback Messages */
        .plugin-feedback {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-radius: 12px;
          margin-bottom: 24px;
          animation: slideIn 0.3s ease;
        }

        .plugin-feedback.error {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .plugin-feedback.success {
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .feedback-icon {
          font-size: 20px;
        }

        .feedback-close {
          margin-left: auto;
          background: none;
          border: none;
          font-size: 22px;
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.2s;
          color: inherit;
        }

        .feedback-close:hover {
          opacity: 1;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Plugin Content */
        .plugin-content {
          display: flex;
          flex-direction: column;
          gap: 28px;
          padding-bottom: 60px;
        }

        .plugin-section {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 24px;
        }

        .section-header {
          margin-bottom: 20px;
        }

        .section-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .section-header p {
          margin: 6px 0 0;
          color: var(--text-secondary);
          font-size: 14px;
        }

        /* Plugin Grid - Full Width Stretched Cards */
        .plugins-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }

        .plugin-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          cursor: pointer;
          transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
          display: flex;
          flex-direction: column;
        }

        .plugin-card:hover {
          box-shadow: var(--shadow);
          transform: translateY(-3px);
          border-color: var(--primary);
        }

        .plugin-card.installed {
          border-color: var(--primary);
          background: linear-gradient(135deg, rgba(11, 76, 138, 0.04) 0%, rgba(99, 102, 241, 0.02) 100%);
        }

        .plugin-card.installed.custom {
          border-color: #8b5cf6;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.06) 0%, rgba(139, 92, 246, 0.02) 100%);
        }

        .plugin-card.upload-card {
          border: 2px dashed var(--border);
          background: var(--surface);
          cursor: pointer;
        }

        .plugin-card.upload-card:hover {
          border-color: var(--primary);
          background: linear-gradient(135deg, rgba(11, 76, 138, 0.04) 0%, rgba(99, 102, 241, 0.02) 100%);
        }

        .plugin-card.upload-card.dragging {
          border-color: var(--primary);
          background: linear-gradient(135deg, rgba(11, 76, 138, 0.08) 0%, rgba(99, 102, 241, 0.04) 100%);
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(11, 76, 138, 0.15);
        }

        .plugin-card.upload-card.installing {
          pointer-events: none;
          opacity: 0.8;
        }

        .plugin-card.upload-card .plugin-card-top {
          background: linear-gradient(135deg, #64748b 0%, #475569 100%);
        }

        .plugin-card.upload-card .plugin-icon svg {
          color: white;
        }

        .upload-spinner-small {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .upload-hint-badge {
          padding: 4px 10px;
          background: var(--surface-secondary);
          border: 1px solid var(--border);
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
          color: var(--text-tertiary);
        }

        .plugin-card-top {
          height: 100px;
          background: linear-gradient(135deg, var(--primary) 0%, #6366f1 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .plugin-icon {
          font-size: 44px;
          filter: drop-shadow(0 2px 6px rgba(0,0,0,0.25));
        }

        .status-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          padding: 5px 10px;
          font-size: 11px;
          font-weight: 600;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .status-badge.enabled {
          background: #22c55e;
          color: white;
        }

        .status-badge.disabled {
          background: rgba(255,255,255,0.95);
          color: var(--text-secondary);
        }

        .plugin-card-body {
          padding: 18px;
          flex: 1;
        }

        .plugin-name {
          font-size: 17px;
          font-weight: 600;
          margin: 0 0 8px;
          color: var(--text-primary);
        }

        .plugin-desc {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.5;
        }

        /* Inline Settings on Plugin Card */
        .plugin-inline-settings {
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid var(--border-light);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .inline-setting {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .inline-setting-label {
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .inline-setting-control {
          flex-shrink: 0;
        }

        .toggle-btn {
          padding: 4px 12px;
          font-size: 11px;
          font-weight: 600;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--surface-secondary);
          color: var(--text-tertiary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .toggle-btn.active {
          background: var(--primary);
          border-color: var(--primary);
          color: white;
        }

        .toggle-btn:hover {
          border-color: var(--primary);
        }

        .inline-select {
          padding: 4px 8px;
          font-size: 11px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text-primary);
          cursor: pointer;
          max-width: 120px;
        }

        .inline-input {
          padding: 4px 8px;
          font-size: 11px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text-primary);
          width: 60px;
          text-align: center;
        }

        .more-settings-btn {
          font-size: 11px;
          color: var(--primary);
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px 0;
          font-weight: 500;
          text-align: left;
        }

        .more-settings-btn:hover {
          text-decoration: underline;
        }

        .plugin-card-footer {
          padding: 14px 18px;
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--surface-secondary);
        }

        .plugin-meta {
          font-size: 12px;
          color: var(--text-tertiary);
          font-weight: 500;
        }

        .plugin-actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 500;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .action-btn.primary {
          background: var(--primary);
          color: white;
        }

        .action-btn.primary:hover {
          background: var(--primary-dark, #084277);
          transform: translateY(-1px);
        }

        .action-btn.primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .action-btn.secondary {
          background: var(--surface);
          color: var(--text-primary);
          border: 1px solid var(--border);
        }

        .action-btn.secondary:hover {
          background: var(--surface-tertiary);
        }

        .action-btn.danger {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          padding: 8px 10px;
        }

        .action-btn.danger:hover {
          background: rgba(239, 68, 68, 0.2);
        }

        /* Upload Zone */
        .upload-zone {
          border: 2px dashed var(--border);
          border-radius: 16px;
          padding: 50px 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: var(--surface-secondary);
        }

        .upload-zone:hover {
          border-color: var(--primary);
          background: rgba(11, 76, 138, 0.04);
        }

        .upload-zone.dragging {
          border-color: var(--primary);
          background: rgba(11, 76, 138, 0.1);
          border-style: solid;
        }

        .upload-zone.installing {
          pointer-events: none;
          opacity: 0.7;
        }

        .upload-icon {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--surface);
          border-radius: 16px;
          color: var(--text-secondary);
          box-shadow: var(--shadow-sm);
        }

        .upload-text {
          font-size: 16px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .upload-hint {
          font-size: 14px;
          color: var(--text-secondary);
        }

        .upload-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Settings Modal Overlay */
        .settings-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 24px;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .settings-modal {
          width: 100%;
          max-width: 560px;
          max-height: 80vh;
          background: var(--surface);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-xl);
          overflow: hidden;
          animation: slideUp 0.2s ease;
        }

        @keyframes slideUp {
          from { 
            opacity: 0; 
            transform: translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }

        .settings-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
          background: var(--surface-secondary);
        }

        .settings-title {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--text-primary);
        }

        .settings-title h2 {
          font-size: 17px;
          font-weight: 600;
          margin: 0;
        }

        .settings-title svg {
          color: var(--primary);
        }

        .settings-close-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          color: var(--text-secondary);
          transition: all 0.2s;
        }

        .settings-close-btn:hover {
          background: var(--surface-tertiary);
          color: var(--text-primary);
        }

        .settings-modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px;
        }

        .settings-modal-footer {
          padding: 16px 24px;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: flex-end;
          background: var(--surface-secondary);
        }

        .settings-done-btn {
          padding: 10px 24px;
          font-size: 14px;
          font-weight: 600;
          border-radius: 8px;
          border: none;
          background: var(--primary);
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .settings-done-btn:hover {
          background: var(--primary-hover);
        }

        /* Settings Section */
        .settings-section .section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 28px;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0;
          line-height: 1;
          transition: color 0.2s;
        }

        .close-btn:hover {
          color: var(--text-primary);
        }

        .settings-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .setting-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 20px;
          background: var(--surface-secondary);
          border-radius: 12px;
        }

        .setting-info {
          flex: 1;
          min-width: 0;
        }

        .setting-label {
          font-weight: 500;
          color: var(--text-primary);
          font-size: 15px;
        }

        .setting-desc {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 5px 0 0;
        }

        .setting-control {
          flex-shrink: 0;
          margin-left: 20px;
        }

        .setting-input,
        .setting-select {
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text-primary);
          font-size: 14px;
          min-width: 140px;
        }

        .setting-select {
          cursor: pointer;
        }

        .toggle {
          position: relative;
          display: inline-block;
          width: 48px;
          height: 26px;
        }

        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--border);
          transition: 0.3s;
          border-radius: 26px;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }

        input:checked + .toggle-slider {
          background: var(--primary);
        }

        input:checked + .toggle-slider:before {
          transform: translateX(22px);
        }

        .no-settings {
          color: var(--text-secondary);
          font-style: italic;
          padding: 20px;
          text-align: center;
          background: var(--surface-secondary);
          border-radius: 12px;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .plugin-manager-page {
            padding: 20px;
          }

          .plugin-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
            padding: 20px;
          }

          .plugin-stats {
            width: 100%;
            justify-content: flex-start;
          }

          .plugins-grid {
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          }
        }

        @media (max-width: 600px) {
          .plugins-grid {
            grid-template-columns: 1fr;
          }

          .setting-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .setting-control {
            margin-left: 0;
            width: 100%;
          }

          .setting-input,
          .setting-select {
            width: 100%;
          }
        }

        /* Plugin Code Editor */
        .plugin-editor-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 24px;
        }

        .plugin-editor-modal {
          width: 100%;
          max-width: 1000px;
          height: 90vh;
          max-height: 800px;
          background: var(--surface);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-xl);
          overflow: hidden;
        }

        .editor-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          background: var(--surface-secondary);
        }

        .editor-title {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--text-primary);
        }

        .editor-title h2 {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
        }

        .editor-title svg {
          color: var(--primary);
        }

        .editor-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .editor-hint {
          font-size: 12px;
          color: var(--text-tertiary);
        }

        .editor-btn {
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .editor-btn.primary {
          background: var(--primary);
          color: white;
        }

        .editor-btn.primary:hover:not(:disabled) {
          background: var(--primary-hover);
        }

        .editor-btn.primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .editor-btn.secondary {
          background: var(--surface);
          color: var(--text-primary);
          border: 1px solid var(--border);
        }

        .editor-btn.secondary:hover {
          background: var(--hover-bg);
        }

        .editor-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: var(--error-light);
          color: var(--error);
          font-size: 13px;
          border-bottom: 1px solid rgba(239, 68, 68, 0.2);
        }

        .editor-btn.ai-btn {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          border: none;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .editor-btn.ai-btn:hover {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
        }

        .editor-btn.ai-btn.active {
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.4);
        }

        .ai-assist-panel {
          border-bottom: 1px solid var(--border);
          background: linear-gradient(180deg, rgba(99, 102, 241, 0.05), transparent);
        }

        .ai-assist-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 500;
          color: var(--primary);
          border-bottom: 1px solid var(--border);
        }

        .ai-close-btn {
          margin-left: auto;
          background: none;
          border: none;
          font-size: 18px;
          color: var(--text-tertiary);
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .ai-close-btn:hover {
          background: var(--hover-bg);
          color: var(--text-primary);
        }

        .ai-assist-body {
          padding: 12px 20px;
        }

        .ai-quick-actions {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .ai-quick-actions button {
          padding: 6px 12px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 12px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .ai-quick-actions button:hover {
          background: var(--primary-light);
          border-color: var(--primary);
          color: var(--primary);
        }

        .ai-input-row {
          display: flex;
          gap: 8px;
        }

        .ai-input {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--surface);
          color: var(--text-primary);
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s ease;
        }

        .ai-input:focus {
          border-color: var(--primary);
        }

        .ai-input::placeholder {
          color: var(--text-tertiary);
        }

        .ai-submit-btn {
          padding: 10px 16px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .ai-submit-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
        }

        .ai-submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .ai-help-text {
          margin-top: 8px;
          font-size: 12px;
          color: var(--text-tertiary);
        }

        .editor-body {
          flex: 1;
          overflow: hidden;
          padding: 0;
        }

        .code-editor {
          width: 100%;
          height: 100%;
          padding: 20px;
          border: none;
          resize: none;
          font-family: 'Consolas', 'Monaco', 'Fira Code', 'SF Mono', monospace;
          font-size: 13px;
          line-height: 1.6;
          background: #1e1e1e;
          color: #d4d4d4;
          outline: none;
          tab-size: 2;
        }

        .code-editor::placeholder {
          color: #6e6e80;
        }

        .editor-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 20px;
          border-top: 1px solid var(--border);
          background: var(--surface-secondary);
        }

        .editor-stats {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: var(--text-tertiary);
        }

        .action-btn.icon-btn {
          padding: 6px 8px;
          background: var(--surface-secondary);
          border: 1px solid var(--border);
        }

        .action-btn.icon-btn:hover {
          background: var(--hover-bg);
          border-color: var(--primary);
          color: var(--primary);
        }

        @media (max-width: 768px) {
          .plugin-editor-modal {
            height: 100vh;
            max-height: none;
            border-radius: 0;
          }

          .plugin-editor-overlay {
            padding: 0;
          }

          .editor-header {
            flex-direction: column;
            gap: 12px;
            align-items: flex-start;
          }

          .editor-actions {
            width: 100%;
            justify-content: space-between;
          }

          .editor-hint {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default PluginManagerPage;
