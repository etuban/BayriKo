import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { TaskDrawer } from './TaskDrawer';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { useTask } from '../context/TaskContext';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { confirmingDelete, cancelDelete, deleteTask, isDeleting } = useTask();

  return (
    <div className="flex h-screen overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-dark-bg p-6">
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
