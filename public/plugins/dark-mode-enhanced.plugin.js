/**
 * Custom Color Themes Plugin
 * Applies comprehensive dark color themes to the entire app
 */
({
  id: "dark-mode-enhanced",
  name: "Custom Color Themes",
  version: "2.1.0",
  description: "Apply beautiful dark color themes with comprehensive styling for all UI elements.",
  author: "gvidtech Team",
  
  settings: [
    {
      key: "theme",
      type: "select",
      label: "Color Theme",
      description: "Choose your preferred color theme",
      default: "ocean",
      options: [
        { value: "ocean", label: "Ocean Teal (Default)" },
        { value: "light", label: "Light / White" },
        { value: "midnight", label: "Midnight Blue" },
        { value: "forest", label: "Forest Green" },
        { value: "sunset", label: "Sunset Orange" },
        { value: "purple", label: "Deep Purple" },
        { value: "crimson", label: "Crimson Red" }
      ]
    },
    {
      key: "sidebarDark",
      type: "boolean",
      label: "Dark Sidebar",
      description: "Apply dark theme to sidebar",
      default: true
    }
  ],
  
  hooks: {},
  
  activate: function(settings) {
    var theme = (settings && settings.theme) || "midnight";
    var sidebarDark = settings ? settings.sidebarDark !== false : true;
    
    var themes = {
      light: {
        primary: "#0b4c8a",
        primaryHover: "#1400a0",
        primaryLight: "rgba(24, 0, 173, 0.1)",
        background: "#f5f5f7",
        contentBg: "#f5f5f7",
        surface: "#ffffff",
        surfaceSecondary: "#f7f7f8",
        surfaceTertiary: "#ececf1",
        cardBg: "#ffffff",
        cardBorder: "#e5e5e5",
        headerBg: "#ffffff",
        border: "#e5e5e5",
        borderLight: "#f0f0f0",
        divider: "#e0e0e0",
        textPrimary: "#0d0d0d",
        textSecondary: "#6e6e80",
        textTertiary: "#8e8ea0",
        sidebarBg: "#f9f9f9",
        sidebarText: "#0d0d0d",
        sidebarIcon: "#6e6e80",
        sidebarActiveBg: "rgba(24, 0, 173, 0.1)",
        sidebarActiveText: "#0b4c8a",
        hoverBg: "#ececf1",
        shadow: "0 0 15px rgba(0,0,0,0.1)",
        shadowSm: "0 2px 8px rgba(0,0,0,0.08)",
        shadowLg: "0 4px 20px rgba(0,0,0,0.12)",
        shadowXl: "0 8px 32px rgba(0,0,0,0.15)"
      },
      midnight: { 
        primary: "#3b82f6", 
        primaryHover: "#2563eb",
        primaryLight: "rgba(59, 130, 246, 0.15)",
        background: "#0f0f1a",
        contentBg: "#0f0f1a",
        surface: "#1a1a2e",
        surfaceSecondary: "#16213e",
        surfaceTertiary: "#0f3460",
        cardBg: "#1a1a2e",
        cardBorder: "#2a2a4a",
        headerBg: "#16213e",
        border: "#2a2a4a",
        borderLight: "#3a3a5a",
        divider: "#2a2a4a",
        textPrimary: "#e4e4e7",
        textSecondary: "#a1a1aa",
        textTertiary: "#71717a",
        sidebarBg: "#0f0f23",
        sidebarText: "#e4e4e7",
        sidebarIcon: "#a1a1aa",
        sidebarActiveBg: "rgba(59, 130, 246, 0.2)",
        sidebarActiveText: "#3b82f6",
        hoverBg: "#252545",
        shadow: "0 0 15px rgba(0,0,0,0.5)",
        shadowSm: "0 2px 8px rgba(0,0,0,0.4)",
        shadowLg: "0 4px 20px rgba(0,0,0,0.5)",
        shadowXl: "0 8px 32px rgba(0,0,0,0.6)"
      },
      forest: { 
        primary: "#22c55e", 
        primaryHover: "#16a34a",
        primaryLight: "rgba(34, 197, 94, 0.15)",
        background: "#0a1a0a",
        contentBg: "#0a1a0a",
        surface: "#1a2e1a",
        surfaceSecondary: "#162e16",
        surfaceTertiary: "#0f460f",
        cardBg: "#1a2e1a",
        cardBorder: "#2a4a2a",
        headerBg: "#162e16",
        border: "#2a4a2a",
        borderLight: "#3a5a3a",
        divider: "#2a4a2a",
        textPrimary: "#e4e7e4",
        textSecondary: "#a1aaa1",
        textTertiary: "#717a71",
        sidebarBg: "#0f230f",
        sidebarText: "#e4e7e4",
        sidebarIcon: "#a1aaa1",
        sidebarActiveBg: "rgba(34, 197, 94, 0.2)",
        sidebarActiveText: "#22c55e",
        hoverBg: "#254525",
        shadow: "0 0 15px rgba(0,0,0,0.5)",
        shadowSm: "0 2px 8px rgba(0,0,0,0.4)",
        shadowLg: "0 4px 20px rgba(0,0,0,0.5)",
        shadowXl: "0 8px 32px rgba(0,0,0,0.6)"
      },
      sunset: { 
        primary: "#f97316", 
        primaryHover: "#ea580c",
        primaryLight: "rgba(249, 115, 22, 0.15)",
        background: "#1a0f0a",
        contentBg: "#1a0f0a",
        surface: "#2e1a1a",
        surfaceSecondary: "#3d2317",
        surfaceTertiary: "#4a2810",
        cardBg: "#2e1a1a",
        cardBorder: "#4a2a2a",
        headerBg: "#3d2317",
        border: "#4a2a2a",
        borderLight: "#5a3a3a",
        divider: "#4a2a2a",
        textPrimary: "#fef3c7",
        textSecondary: "#d6a87c",
        textTertiary: "#b8956e",
        sidebarBg: "#1f1410",
        sidebarText: "#fef3c7",
        sidebarIcon: "#d6a87c",
        sidebarActiveBg: "rgba(249, 115, 22, 0.2)",
        sidebarActiveText: "#f97316",
        hoverBg: "#453025",
        shadow: "0 0 15px rgba(0,0,0,0.5)",
        shadowSm: "0 2px 8px rgba(0,0,0,0.4)",
        shadowLg: "0 4px 20px rgba(0,0,0,0.5)",
        shadowXl: "0 8px 32px rgba(0,0,0,0.6)"
      },
      purple: { 
        primary: "#a855f7", 
        primaryHover: "#9333ea",
        primaryLight: "rgba(168, 85, 247, 0.15)",
        background: "#0f0a1a",
        contentBg: "#0f0a1a",
        surface: "#1e1a2e",
        surfaceSecondary: "#2d1f4e",
        surfaceTertiary: "#3d2a6e",
        cardBg: "#1e1a2e",
        cardBorder: "#3a2a5a",
        headerBg: "#2d1f4e",
        border: "#3a2a5a",
        borderLight: "#4a3a6a",
        divider: "#3a2a5a",
        textPrimary: "#e4e4f7",
        textSecondary: "#a1a1ca",
        textTertiary: "#71719a",
        sidebarBg: "#150f23",
        sidebarText: "#e4e4f7",
        sidebarIcon: "#a1a1ca",
        sidebarActiveBg: "rgba(168, 85, 247, 0.2)",
        sidebarActiveText: "#a855f7",
        hoverBg: "#352545",
        shadow: "0 0 15px rgba(0,0,0,0.5)",
        shadowSm: "0 2px 8px rgba(0,0,0,0.4)",
        shadowLg: "0 4px 20px rgba(0,0,0,0.5)",
        shadowXl: "0 8px 32px rgba(0,0,0,0.6)"
      },
      crimson: { 
        primary: "#ef4444", 
        primaryHover: "#dc2626",
        primaryLight: "rgba(239, 68, 68, 0.15)",
        background: "#1a0a0a",
        contentBg: "#1a0a0a",
        surface: "#2e1a1a",
        surfaceSecondary: "#3e1616",
        surfaceTertiary: "#501010",
        cardBg: "#2e1a1a",
        cardBorder: "#5a2a2a",
        headerBg: "#3e1616",
        border: "#5a2a2a",
        borderLight: "#6a3a3a",
        divider: "#5a2a2a",
        textPrimary: "#fecaca",
        textSecondary: "#d4a5a5",
        textTertiary: "#b08080",
        sidebarBg: "#1a0f0f",
        sidebarText: "#fecaca",
        sidebarIcon: "#d4a5a5",
        sidebarActiveBg: "rgba(239, 68, 68, 0.2)",
        sidebarActiveText: "#ef4444",
        hoverBg: "#452525",
        shadow: "0 0 15px rgba(0,0,0,0.5)",
        shadowSm: "0 2px 8px rgba(0,0,0,0.4)",
        shadowLg: "0 4px 20px rgba(0,0,0,0.5)",
        shadowXl: "0 8px 32px rgba(0,0,0,0.6)"
      },
      ocean: { 
        primary: "#06b6d4", 
        primaryHover: "#0891b2",
        primaryLight: "rgba(6, 182, 212, 0.15)",
        background: "#0a1a1c",
        contentBg: "#0a1a1c",
        surface: "#1a2a2e",
        surfaceSecondary: "#163e42",
        surfaceTertiary: "#0f5055",
        cardBg: "#1a2a2e",
        cardBorder: "#2a4a4e",
        headerBg: "#163e42",
        border: "#2a4a4e",
        borderLight: "#3a5a5e",
        divider: "#2a4a4e",
        textPrimary: "#e4f7f7",
        textSecondary: "#a1caca",
        textTertiary: "#71a0a0",
        sidebarBg: "#0f1e20",
        sidebarText: "#e4f7f7",
        sidebarIcon: "#a1caca",
        sidebarActiveBg: "rgba(6, 182, 212, 0.2)",
        sidebarActiveText: "#06b6d4",
        hoverBg: "#254045",
        shadow: "0 0 15px rgba(0,0,0,0.5)",
        shadowSm: "0 2px 8px rgba(0,0,0,0.4)",
        shadowLg: "0 4px 20px rgba(0,0,0,0.5)",
        shadowXl: "0 8px 32px rgba(0,0,0,0.6)"
      }
    };
    
    var colors = themes[theme] || themes.midnight;
    var root = document.documentElement;
    
    // Apply ALL CSS variables for complete theming
    // Primary colors
    root.style.setProperty("--primary", colors.primary);
    root.style.setProperty("--primary-hover", colors.primaryHover);
    root.style.setProperty("--primary-light", colors.primaryLight);
    
    // Background colors - CRITICAL for dark theme
    root.style.setProperty("--background", colors.background);
    root.style.setProperty("--content-bg", colors.contentBg);
    
    // Surface colors
    root.style.setProperty("--surface", colors.surface);
    root.style.setProperty("--surface-secondary", colors.surfaceSecondary);
    root.style.setProperty("--surface-tertiary", colors.surfaceTertiary);
    
    // Card colors
    root.style.setProperty("--card-bg", colors.cardBg);
    root.style.setProperty("--card-border", colors.cardBorder);
    root.style.setProperty("--card-shadow", colors.shadow);
    
    // Header
    root.style.setProperty("--header-bg", colors.headerBg);
    
    // Borders
    root.style.setProperty("--border", colors.border);
    root.style.setProperty("--border-light", colors.borderLight);
    root.style.setProperty("--divider", colors.divider);
    
    // Text colors
    root.style.setProperty("--text-primary", colors.textPrimary);
    root.style.setProperty("--text-secondary", colors.textSecondary);
    root.style.setProperty("--text-tertiary", colors.textTertiary);
    
    // Hover state
    root.style.setProperty("--hover-bg", colors.hoverBg);
    
    // Shadows
    root.style.setProperty("--shadow", colors.shadow);
    root.style.setProperty("--shadow-sm", colors.shadowSm);
    root.style.setProperty("--shadow-lg", colors.shadowLg);
    root.style.setProperty("--shadow-xl", colors.shadowXl);
    
    // Sidebar colors
    if (sidebarDark) {
      root.style.setProperty("--sidebar-bg", colors.sidebarBg);
      root.style.setProperty("--sidebar-text", colors.sidebarText);
      root.style.setProperty("--sidebar-icon", colors.sidebarIcon);
      root.style.setProperty("--sidebar-active-bg", colors.sidebarActiveBg);
      root.style.setProperty("--sidebar-active-text", colors.sidebarActiveText);
    }
    
    // Add data attribute for CSS targeting
    document.body.setAttribute("data-theme", theme === "light" ? "light" : "dark");
    document.body.setAttribute("data-theme-variant", theme);
    
    console.log("[Custom Color Themes] Applied " + theme + " theme with full UI coverage");
  },
  
  deactivate: function() {
    var root = document.documentElement;
    var props = [
      "--primary", "--primary-hover", "--primary-light",
      "--background", "--content-bg",
      "--surface", "--surface-secondary", "--surface-tertiary",
      "--card-bg", "--card-border", "--card-shadow",
      "--header-bg",
      "--border", "--border-light", "--divider",
      "--text-primary", "--text-secondary", "--text-tertiary",
      "--hover-bg",
      "--shadow", "--shadow-sm", "--shadow-lg", "--shadow-xl",
      "--sidebar-bg", "--sidebar-text", "--sidebar-icon",
      "--sidebar-active-bg", "--sidebar-active-text"
    ];
    
    props.forEach(function(prop) {
      root.style.removeProperty(prop);
    });
    
    document.body.removeAttribute("data-theme");
    document.body.removeAttribute("data-theme-variant");
    
    console.log("[Custom Color Themes] Theme reset to defaults");
  }
})
