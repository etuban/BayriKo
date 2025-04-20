import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { TaskDrawer } from './TaskDrawer';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { useTask } from '../context/TaskContext';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { confirmingDelete, cancelDelete, deleteTask, isDeleting } = useTask();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Check localStorage for sidebar state
  useEffect(() => {
    const checkSidebarState = () => {
      const savedState = localStorage.getItem('sidebarCollapsed');
      if (savedState !== null) {
        setSidebarCollapsed(savedState === 'true');
      }
    };
    
    // Initial check
    checkSidebarState();
    
    // Listen for changes to localStorage
    const handleStorageChange = () => {
      checkSidebarState();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Custom event listener for sidebar toggle
    const handleSidebarToggle = () => {
      checkSidebarState();
    };
    
    document.addEventListener('sidebarToggle', handleSidebarToggle);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('sidebarToggle', handleSidebarToggle);
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden font-sans">
      {/* Mobile Sidebar - This will be toggled via header menu button */}
      <div className="fixed inset-0 bg-black/70 z-30 transition-opacity duration-300 sm:hidden" 
        id="mobile-sidebar-overlay" 
        style={{ display: 'none' }} 
        onClick={() => {
          const mobileMenu = document.getElementById('mobile-sidebar');
          const overlay = document.getElementById('mobile-sidebar-overlay');
          if (mobileMenu) mobileMenu.classList.add('hidden');
          if (overlay) overlay.style.display = 'none';
          document.body.classList.remove('overflow-hidden');
        }}
      >
      </div>
      
      <div id="mobile-sidebar" className="fixed top-0 left-0 h-full z-40 hidden sm:hidden w-64 bg-background shadow-xl">
        <Sidebar 
          mobile={true} 
          onClose={() => {
            const mobileMenu = document.getElementById('mobile-sidebar');
            const overlay = document.getElementById('mobile-sidebar-overlay');
            if (mobileMenu) mobileMenu.classList.add('hidden');
            if (overlay) overlay.style.display = 'none';
            document.body.classList.remove('overflow-hidden');
          }} 
        />
      </div>
      
      {/* Desktop Sidebar - Fixed position for larger screens */}
      <div className="fixed top-0 left-0 h-full z-20 hidden sm:block">
        <Sidebar />
      </div>
      
      {/* Main Content */}
      <div 
        className={cn(
          "flex-1 flex flex-col overflow-hidden transition-all duration-300 w-full",
          sidebarCollapsed ? "sm:ml-20" : "sm:ml-64"
        )}
      >
        {/* Header */}
        <Header />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-dark-bg p-3 sm:p-6">
          {children}
        </main>
      </div>
      
      {/* Task Drawer (Side panel for adding/editing tasks) */}
      <TaskDrawer />
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal 
        isOpen={confirmingDelete !== null}
        onClose={cancelDelete}
        onConfirm={() => confirmingDelete && deleteTask(confirmingDelete)}
        isLoading={isDeleting}
      />
    </div>
  );
}
