import React from 'react';
import { useLocation } from 'wouter';
import { Menu, SunMoon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { useTask } from '@/context/TaskContext';
import { NotificationDropdown } from './NotificationDropdown';

export function Header() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { openDrawer } = useTask();
  
  // Toggle sidebar on mobile
  const toggleSidebar = () => {
    const sidebar = document.querySelector('aside');
    sidebar?.classList.toggle('hidden');
    sidebar?.classList.toggle('sm:block');
  };
  
  // Get page title from location
  const getPageTitle = () => {
    switch (location) {
      case '/':
        return 'Tasks';
      case '/dashboard':
        return 'Dashboard';
      case '/payable':
        return 'Task Payable';
      case '/projects':
        return 'Projects';
      case '/users':
        return 'Users';
      case '/settings':
        return 'Settings';
      default:
        return 'MyByd';
    }
  };
  
  // Get page subtitle from location
  const getPageSubtitle = () => {
    switch (location) {
      case '/':
        return 'All Tasks';
      case '/dashboard':
        return 'Overview';
      case '/payable':
        return 'Invoice Generation';
      case '/projects':
        return 'All Projects';
      case '/users':
        return 'User Management';
      case '/settings':
        return 'User Settings';
      default:
        return '';
    }
  };

  return (
    <header className="bg-dark-surface border-b border-dark-border py-4 px-6 flex items-center justify-between">
      {/* Left: Toggle Sidebar Button + Breadcrumb */}
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          className="mr-4 text-gray-400 hover:text-white lg:hidden"
          onClick={toggleSidebar}
        >
          <Menu className="h-6 w-6" />
        </Button>
        
        <div className="flex items-center text-lg font-semibold">
          <span>{getPageTitle()}</span>
          <span className="mx-2 text-gray-500">/</span>
          <span className="text-primary">{getPageSubtitle()}</span>
        </div>
      </div>
      
      {/* Right: Actions */}
      <div className="flex items-center space-x-4">
        {/* Theme Toggle */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme} 
          className="text-gray-400 hover:text-white"
        >
          <SunMoon className="h-5 w-5" />
        </Button>
        
        {/* Notifications */}
        <NotificationDropdown />
        
        {/* Create New Task Button */}
        <Button 
          variant="default" 
          className="bg-primary hover:bg-primary/90 text-white"
          onClick={() => openDrawer('new')}
        >
          New Task
        </Button>
      </div>
    </header>
  );
}
