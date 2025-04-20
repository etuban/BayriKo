import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useAuth } from '../context/AuthContext';
import { UserProfileCard } from './UserProfileCard';
import { GiReceiveMoney } from 'react-icons/gi';
import { 
  LayoutDashboard, 
  ListTodo, 
  BanknoteIcon, 
  FolderKanban, 
  Users, 
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

export function Sidebar() {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  
  // Check localStorage for saved sidebar state
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setCollapsed(savedState === 'true');
    }
  }, []);
  
  // Toggle sidebar and save state
  const toggleSidebar = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
    
    // Dispatch custom event for Layout to listen
    document.dispatchEvent(new CustomEvent('sidebarToggle'));
  };

  const navItems = [
    {
      title: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5 mr-3" />,
      path: '/dashboard',
      display: true,
    },
    {
      title: 'Tasks',
      icon: <ListTodo className="w-5 h-5 mr-3" />,
      path: '/tasks',
      display: true,
    },
    {
      title: 'Task Payable',
      icon: <BanknoteIcon className="w-5 h-5 mr-3" />,
      path: '/payable',
      display: true,
    },
    {
      title: 'Projects',
      icon: <FolderKanban className="w-5 h-5 mr-3" />,
      path: '/projects',
      display: user?.role !== 'staff',
    },
    {
      title: 'Users',
      icon: <Users className="w-5 h-5 mr-3" />,
      path: '/users',
      display: user?.role !== 'staff',
    },
    {
      title: 'Settings',
      icon: <Settings className="w-5 h-5 mr-3" />,
      path: '/settings',
      display: true,
    },
  ];

  return (
    <aside 
      className={cn(
        "bg-background border-r border-border flex-shrink-0 transition-all duration-300 overflow-hidden relative h-full",
        collapsed ? "w-20" : "w-64",
        "hidden sm:block" // Hide on mobile, use toggle in header
      )}
    >
      {/* Logo and App Name */}
      <div className="flex items-center p-4 border-b border-border">
        <div className="bg-primary p-2 rounded-md">
          <GiReceiveMoney className="w-6 h-6 text-white" />
        </div>
        {!collapsed && <h1 className="ml-3 text-xl font-semibold">BayadMin</h1>}
      </div>
      
      {/* Navigation Items */}
      <nav className="p-4">
        {!collapsed && (
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Main Menu
          </h2>
        )}
        <ul>
          {navItems
            .filter(item => item.display)
            .map((item, index) => (
              <li key={index} className="mb-1">
                <Link href={item.path}>
                  <a
                    className={cn(
                      "flex items-center px-4 py-2 rounded-md w-full text-left transition-colors",
                      location === item.path
                        ? "bg-primary text-white"
                        : "hover:bg-muted"
                    )}
                  >
                    {React.cloneElement(item.icon, { 
                      className: collapsed ? "w-5 h-5 mx-auto" : "w-5 h-5 mr-3" 
                    })}
                    {!collapsed && <span>{item.title}</span>}
                  </a>
                </Link>
              </li>
            ))}
        </ul>
      </nav>
      
      {/* User Profile Section */}
      {!collapsed && <UserProfileCard user={user} />}
      
      {/* Toggle Button */}
      <button 
        onClick={toggleSidebar}
        className="absolute top-1/2 -right-3 bg-primary text-white rounded-full p-1.5 shadow-md hover:bg-primary/90 transition-colors z-10"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
    </aside>
  );
}
