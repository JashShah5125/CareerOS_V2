import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileSearch,
  Wand2,
  Briefcase,
  Layers,
  MessageSquareCode,
  LineChart,
  Settings as SettingsIcon,
  Menu,
  X,
  LogOut,
  Sparkles,
  FileCheck
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

interface SidebarProps {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
    headline: string;
    isGoogleUser?: boolean;
  } | null;
  onLogout: () => void;
}

export default function Sidebar({ user, onLogout }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Resume Analyzer', path: '/analyzer', icon: FileSearch },
    { name: 'ATS Analyzer', path: '/ats-analyzer', icon: FileCheck },
    { name: 'Job Matcher', path: '/matcher', icon: Briefcase },
    { name: 'Application Tracker', path: '/tracker', icon: Layers },
    { name: 'Interview Prep', path: '/interview', icon: MessageSquareCode },
    { name: 'Career Analytics', path: '/analytics', icon: LineChart },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="mobile-navbar">
        <div className="mobile-brand">
          <Sparkles size={20} className="brand-icon" />
          <span>CareerOS</span>
        </div>
        <button className="burger-btn" onClick={toggleSidebar}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Container */}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand">
            <Sparkles size={24} className="brand-icon" />
            <div className="brand-text">
              <h3>CareerOS</h3>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <item.icon size={18} className="nav-icon" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer Area with Profile and Actions */}
        <div className="sidebar-footer">
          {user && (
            <NavLink to="/settings" className="profile-widget" style={{ textDecoration: 'none', color: 'inherit' }}>
              {user.isGoogleUser ? (
                <img
                  src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt="Avatar"
                  className="profile-avatar"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100';
                  }}
                />
              ) : (
                <div className="profile-initial-avatar">
                  {user.firstName ? user.firstName.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'U')}
                </div>
              )}
              <div className="profile-details">
                <span className="profile-name">{user.firstName} {user.lastName}</span>
                <span className="profile-role">{user.headline || 'User'}</span>
              </div>
            </NavLink>
          )}

          <div className="footer-actions">
            <ThemeToggle />
            <button
              onClick={onLogout}
              className="btn btn-secondary logout-btn"
              title="Log Out"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar Overlay for Mobile */}
      {isOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}

      <style>{`
        .mobile-navbar {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 60px;
          background-color: var(--bg-sidebar);
          border-bottom: 1px solid var(--border);
          padding: 0 1.5rem;
          align-items: center;
          justify-content: space-between;
          z-index: 1000;
        }

        .mobile-brand {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .burger-btn {
          background: none;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
        }

        .sidebar {
          width: 260px;
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(20px);
          border-right: 1px solid rgba(226, 232, 240, 0.8);
          display: flex;
          flex-direction: column;
          height: 100vh;
          position: sticky;
          top: 0;
          z-index: 999;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        [data-theme="dark"] .sidebar {
          background: rgba(11, 15, 25, 0.75);
          border-right: 1px solid rgba(30, 41, 59, 0.7);
        }

        .sidebar-header {
          padding: 1.5rem;
          border-bottom: 1px solid var(--border);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .brand-icon {
          color: #8b5cf6;
        }

        .brand-text h3 {
          font-size: 1.15rem;
          font-weight: 800;
          background: linear-gradient(to right, #6366f1, #a855f7, #ec4899);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .brand-text span {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .sidebar-nav {
          flex: 1;
          padding: 1.5rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          overflow-y: auto;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.625rem 0.875rem;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.15s ease;
        }

        .nav-item:hover {
          background-color: var(--bg-app);
          color: var(--text-primary);
        }

        .nav-item.active {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.12) 100%);
          border-left: 4px solid #6366f1;
          color: #6366f1;
          font-weight: 600;
          padding-left: calc(0.875rem - 4px);
        }

        .nav-icon {
          flex-shrink: 0;
        }

        .sidebar-footer {
          padding: 1.25rem;
          border-top: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .profile-widget {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background-color: var(--bg-app);
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .profile-widget:hover {
          background-color: var(--border);
          border-color: var(--text-muted);
        }

        .profile-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
        }

        .profile-initial-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.95rem;
          flex-shrink: 0;
        }

        .profile-details {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .profile-name {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }

        .profile-role {
          font-size: 0.75rem;
          color: var(--text-muted);
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }

        .footer-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }

        .logout-btn {
          flex: 1;
          font-size: 0.8125rem;
          height: 38px;
          display: inline-flex;
          gap: 0.375rem;
        }

        @media (max-width: 768px) {
          .mobile-navbar {
            display: flex;
          }
          .sidebar {
            position: fixed;
            top: 0;
            bottom: 0;
            left: 0;
            transform: translateX(-100%);
            height: 100vh;
            box-shadow: var(--shadow-lg);
          }
          .sidebar.open {
            transform: translateX(0);
          }
          .sidebar-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.4);
            z-index: 998;
            backdrop-filter: blur(2px);
          }
        }
      `}</style>
    </>
  );
}
