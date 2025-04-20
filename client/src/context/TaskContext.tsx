import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Task, TaskFormValues } from '../types';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface DrawerState {
  isOpen: boolean;
  mode: 'new' | 'edit' | 'view';
  taskId: number | null;
}

interface TaskContextType {
  drawer: DrawerState;
  openDrawer: (mode: 'new' | 'edit' | 'view', taskId?: number) => void;
  closeDrawer: () => void;
  createTask: (task: TaskFormValues) => Promise<void>;
  updateTask: (id: number, task: Partial<TaskFormValues>) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  isDeleting: boolean;
  confirmDelete: (id: number) => void;
  cancelDelete: () => void;
  confirmingDelete: number | null;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState<DrawerState>({
    isOpen: false,
    mode: 'new',
    taskId: null
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const openDrawer = (mode: 'new' | 'edit' | 'view', taskId?: number) => {
    setDrawer({
      isOpen: true,
      mode,
      taskId: taskId || null
    });
  };

  const closeDrawer = () => {
    setDrawer({
      ...drawer,
      isOpen: false
    });
  };

  const createTask = async (task: TaskFormValues) => {
    try {
      const res = await apiRequest('POST', '/api/tasks', task);
      const data = await res.json();
      
      toast({
        title: "Success",
        description: "Task created successfully",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      closeDrawer();
      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateTask = async (id: number, task: Partial<TaskFormValues>) => {
    try {
      const res = await apiRequest('PUT', `/api/tasks/${id}`, task);
      const data = await res.json();
      
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${id}`] });
      closeDrawer();
      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update task",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteTask = async (id: number) => {
    setIsDeleting(true);
    try {
      await apiRequest('DELETE', `/api/tasks/${id}`, {});
      
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setConfirmingDelete(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete task",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDelete = (id: number) => {
    setConfirmingDelete(id);
  };

  const cancelDelete = () => {
    setConfirmingDelete(null);
  };

  const value = {
    drawer,
    openDrawer,
    closeDrawer,
    createTask,
    updateTask,
    deleteTask,
    isDeleting,
    confirmDelete,
    cancelDelete,
    confirmingDelete
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export const useTask = () => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
};
