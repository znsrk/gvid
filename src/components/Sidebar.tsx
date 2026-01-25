import React, { useState } from 'react';
import { Course } from '../types/roadmap';
import { usePlugins } from '../plugins';

interface SidebarProps {
  currentPage: 'prompt' | 'gallery' | 'plugins';
  onNavigate: (page: 'prompt' | 'gallery' | 'plugins') => void;
  recentCourses?: Course[];
  onSelectCourse?: (course: Course) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, recentCourses = [], onSelectCourse }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { plugins } = usePlugins();
  const enabledPluginsCount = plugins.filter(p => p.enabled).length;

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!isCollapsed && (
          <div className="sidebar-logo">
            <svg className="sidebar-logo-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 10l-10-5L2 10l10 5 10-5z"/>
              <path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5"/>
              <path d="M22 10v6"/>
              <circle cx="22" cy="18" r="2"/>
            </svg>
            <span className="logo-text">
              <span className="logo-oqy">Oqy</span><span className="logo-plus">Plus</span>
            </span>
          </div>
        )}
        <button className="sidebar-toggle" onClick={() => setIsCollapsed(!isCollapsed)} title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isCollapsed ? (
              <polyline points="9 18 15 12 9 6"/>
            ) : (
              <polyline points="15 18 9 12 15 6"/>
            )}
          </svg>
        </button>
      </div>
      
      <nav className="sidebar-nav">
        {!isCollapsed && <div className="nav-section-title">Menu</div>}
        <button
          className={`nav-item ${currentPage === 'prompt' ? 'active' : ''}`}
          onClick={() => onNavigate('prompt')}
          title="Generate"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          {!isCollapsed && 'Generate'}
        </button>
        <button
          className={`nav-item ${currentPage === 'gallery' ? 'active' : ''}`}
          onClick={() => onNavigate('gallery')}
          title="My Courses"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
          {!isCollapsed && 'My Courses'}
        </button>
        <button
          className={`nav-item ${currentPage === 'plugins' ? 'active' : ''}`}
          onClick={() => onNavigate('plugins')}
          title="Plugins"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
          {!isCollapsed && 'Plugins'}
          {enabledPluginsCount > 0 && (
            <span className="plugin-badge">{enabledPluginsCount}</span>
          )}
        </button>

        {!isCollapsed && recentCourses.length > 0 && (
          <>
            <div className="nav-section-title" style={{ marginTop: 16 }}>Recent</div>
            {recentCourses.slice(0, 5).map(course => (
              <button
                key={course.id}
                className="nav-item"
                onClick={() => onSelectCourse?.(course)}
                title={course.title}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {course.title}
                </span>
              </button>
            ))}
          </>
        )}
      </nav>
      
      <div className="sidebar-footer">
        {!isCollapsed && <span className="sidebar-version">v1.0</span>}
      </div>
    </aside>
  );
};

export default Sidebar;
