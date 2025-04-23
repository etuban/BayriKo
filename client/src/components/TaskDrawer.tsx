import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { cn, formatTags, parseTags } from '@/lib/utils';
import { useTask } from '@/context/TaskContext';
import { Task, TaskFormValues } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { TaskHistory } from './TaskHistory';
import { TaskComments } from './TaskComments';
import { useAuth } from '@/context/AuthContext';

// Validation schema
const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  projectId: z.coerce.number({
    required_error: 'Project is required',
    invalid_type_error: 'Project is required',
  }),
  assignedToId: z.coerce.number().optional(),
  tags: z.string().optional(),
  startDate: z.string().optional(),
  startTime: z.string().optional(),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
  dueDate: z.string().min(1, 'Due date is required'),
  pricingType: z.enum(['hourly', 'fixed']),
  currency: z.enum(['PHP', 'USD']).default('PHP'),
  hourlyRate: z.coerce.number().optional(),
  fixedPrice: z.coerce.number().optional(),
  status: z.enum(['todo', 'in_progress', 'completed']),
});

export function TaskDrawer() {
  const { drawer, closeDrawer, createTask, updateTask } = useTask();
  const { user } = useAuth();
  
  // Form
  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      projectId: undefined,
      assignedToId: undefined,
      tags: '',
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      dueDate: '',
      pricingType: 'hourly',
      currency: 'PHP',
      hourlyRate: undefined,
      fixedPrice: undefined,
      status: 'todo',
    },
  });
  
  // Query to get task details if in edit or view mode
  const { data: task, isLoading: isLoadingTask } = useQuery({
    queryKey: [`/api/tasks/${drawer.taskId}`],
    enabled: drawer.isOpen && (drawer.mode === 'edit' || drawer.mode === 'view') && drawer.taskId !== null,
  });
  
  // Query to get projects for dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects'],
    enabled: drawer.isOpen,
  });
  
  // Query to get users for dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: drawer.isOpen,
  });
  
  // Check for preselected user from sessionStorage
  useEffect(() => {
    const preselectedUserId = sessionStorage.getItem('preselectedUserId');
    if (preselectedUserId) {
      // Convert to number and set in state for later use
      const userId = parseInt(preselectedUserId);
      // Clear it after reading to prevent reuse on future opens
      sessionStorage.removeItem('preselectedUserId');
      
      // If the drawer is opened in new mode, use this userId
      if (drawer.mode === 'new') {
        form.setValue('assignedToId', userId);
      }
    }
  }, [drawer.isOpen, form]);

  // Set form values when task is loaded or mode changes
  useEffect(() => {
    if (drawer.mode === 'new') {
      // Get preselected user ID if available
      const preselectedUserId = form.getValues('assignedToId');
      
      form.reset({
        title: '',
        description: '',
        projectId: undefined,
        // Keep preselected user if it exists
        assignedToId: preselectedUserId,
        tags: '',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        dueDate: '',
        pricingType: 'hourly',
        hourlyRate: undefined,
        fixedPrice: undefined,
        status: 'todo',
      });
    } else if ((drawer.mode === 'edit' || drawer.mode === 'view') && task) {
      form.reset({
        title: task.title,
        description: task.description || '',
        projectId: task.projectId,
        assignedToId: task.assignedToId,
        tags: task.tags ? formatTags(task.tags) : '',
        startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '',
        startTime: task.startTime || '',
        endDate: task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : '',
        endTime: task.endTime || '',
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        pricingType: task.pricingType,
        currency: task.currency || 'PHP',
        hourlyRate: task.hourlyRate ? task.hourlyRate / 100 : undefined, // Convert from cents to dollars
        fixedPrice: task.fixedPrice ? task.fixedPrice / 100 : undefined, // Convert from cents to dollars
        status: task.status,
      });
      
      // Disable form in view mode
      if (drawer.mode === 'view') {
        Object.keys(form.getValues()).forEach(key => {
          form.register(key as any, { disabled: true });
        });
      }
    }
  }, [drawer.mode, task, form]);
  
  // Handle form submission
  const onSubmit = async (data: z.infer<typeof taskSchema>) => {
    // Convert dollar values to cents for storage
    const formattedData: TaskFormValues = {
      ...data,
      tags: data.tags ? parseTags(data.tags) : undefined,
      hourlyRate: data.pricingType === 'hourly' && data.hourlyRate ? Math.round(data.hourlyRate * 100) : undefined,
      fixedPrice: data.pricingType === 'fixed' && data.fixedPrice ? Math.round(data.fixedPrice * 100) : undefined,
    };
    
    try {
      if (drawer.mode === 'new') {
        await createTask(formattedData);
      } else if (drawer.mode === 'edit' && drawer.taskId) {
        await updateTask(drawer.taskId, formattedData);
      }
    } catch (error) {
      console.error('Failed to save task:', error);
    }
  };
  
  // Watch pricing type to show/hide appropriate fields
  const pricingType = form.watch('pricingType');

  return (
    <div
      className={cn(
        "fixed inset-y-0 right-0 w-full sm:w-96 bg-background border-l border-border shadow-xl z-20 transition-transform duration-300 ease-in-out",
        drawer.isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div className="h-full flex flex-col">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {drawer.mode === 'new' ? 'New Task' : drawer.mode === 'edit' ? 'Edit Task' : 'Task Details'}
          </h2>
          <Button variant="ghost" size="icon" onClick={closeDrawer}>
            <X className="h-6 w-6" />
          </Button>
        </div>
        
        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Task Title */}
            <div>
              <Label htmlFor="title" className="text-sm font-medium mb-1">
                Task Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                {...form.register('title')}
                className="w-full"
                placeholder="Enter task title"
                disabled={drawer.mode === 'view'}
              />
              {form.formState.errors.title && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.title.message}</p>
              )}
            </div>
            
            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-sm font-medium mb-1">
                Description
              </Label>
              <Textarea
                id="description"
                {...form.register('description')}
                className="w-full"
                placeholder="Enter task description"
                rows={3}
                disabled={drawer.mode === 'view'}
              />
            </div>
            
            {/* Project */}
            <div>
              <Label htmlFor="projectId" className="text-sm font-medium mb-1">
                Project <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.watch('projectId')?.toString() || ''}
                onValueChange={(value) => form.setValue('projectId', parseInt(value))}
                disabled={drawer.mode === 'view'}
              >
                <SelectTrigger className="w-full bg-dark-bg border border-dark-border">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project: any) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.projectId && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.projectId.message}</p>
              )}
            </div>
            
            {/* Assigned User */}
            <div>
              <Label htmlFor="assignedToId" className="text-sm font-medium mb-1">
                Assigned To
              </Label>
              <Select
                value={form.watch('assignedToId')?.toString() || ''}
                onValueChange={(value) => form.setValue('assignedToId', parseInt(value))}
                disabled={drawer.mode === 'view'}
              >
                <SelectTrigger className="w-full bg-dark-bg border border-dark-border">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user: any) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.fullName} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Tags */}
            <div>
              <Label htmlFor="tags" className="text-sm font-medium mb-1">
                Tags
              </Label>
              <Input
                id="tags"
                {...form.register('tags')}
                className="w-full p-2 rounded-md bg-dark-bg border border-dark-border"
                placeholder="Enter tags (comma separated)"
                disabled={drawer.mode === 'view'}
              />
            </div>
            
            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate" className="text-sm font-medium mb-1">
                  Start Date
                </Label>
                <Input
                  type="date"
                  id="startDate"
                  {...form.register('startDate')}
                  className="w-full p-2 rounded-md bg-dark-bg border border-dark-border"
                  disabled={drawer.mode === 'view'}
                />
              </div>
              <div>
                <Label htmlFor="startTime" className="text-sm font-medium mb-1">
                  Start Time
                </Label>
                <Input
                  type="time"
                  id="startTime"
                  {...form.register('startTime')}
                  className="w-full p-2 rounded-md bg-dark-bg border border-dark-border"
                  disabled={drawer.mode === 'view'}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="endDate" className="text-sm font-medium mb-1">
                  End Date
                </Label>
                <Input
                  type="date"
                  id="endDate"
                  {...form.register('endDate')}
                  className="w-full p-2 rounded-md bg-dark-bg border border-dark-border"
                  disabled={drawer.mode === 'view'}
                />
              </div>
              <div>
                <Label htmlFor="endTime" className="text-sm font-medium mb-1">
                  End Time
                </Label>
                <Input
                  type="time"
                  id="endTime"
                  {...form.register('endTime')}
                  className="w-full p-2 rounded-md bg-dark-bg border border-dark-border"
                  disabled={drawer.mode === 'view'}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="dueDate" className="text-sm font-medium mb-1">
                Due Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                id="dueDate"
                {...form.register('dueDate')}
                className="w-full p-2 rounded-md bg-dark-bg border border-dark-border"
                disabled={drawer.mode === 'view'}
              />
              {form.formState.errors.dueDate && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.dueDate.message}</p>
              )}
            </div>
            
            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-1">Pricing Type</Label>
                <RadioGroup
                  value={pricingType}
                  onValueChange={(value) => form.setValue('pricingType', value as 'hourly' | 'fixed')}
                  className="flex space-x-4"
                  disabled={drawer.mode === 'view'}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hourly" id="hourly" />
                    <Label htmlFor="hourly">Hourly Rate</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed" id="fixed" />
                    <Label htmlFor="fixed">Fixed Price</Label>
                  </div>
                </RadioGroup>
              </div>
              <div>
                <Label htmlFor="currency" className="text-sm font-medium mb-1">Currency</Label>
                <Select
                  value={form.watch('currency')}
                  onValueChange={(value) => form.setValue('currency', value as 'PHP' | 'USD')}
                  disabled={drawer.mode === 'view'}
                >
                  <SelectTrigger className="w-full bg-dark-bg border border-dark-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PHP">PHP (₱)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {pricingType === 'hourly' && (
              <div>
                <Label htmlFor="hourlyRate" className="text-sm font-medium mb-1">
                  Hourly Rate {form.watch('currency') === 'PHP' ? '(₱)' : '($)'}
                </Label>
                <Input
                  type="number"
                  id="hourlyRate"
                  step="0.01"
                  min="0"
                  {...form.register('hourlyRate', { valueAsNumber: true })}
                  className="w-full p-2 rounded-md bg-dark-bg border border-dark-border"
                  placeholder="0.00"
                  disabled={drawer.mode === 'view'}
                />
              </div>
            )}
            
            {pricingType === 'fixed' && (
              <div>
                <Label htmlFor="fixedPrice" className="text-sm font-medium mb-1">
                  Fixed Price {form.watch('currency') === 'PHP' ? '(₱)' : '($)'}
                </Label>
                <Input
                  type="number"
                  id="fixedPrice"
                  step="0.01"
                  min="0"
                  {...form.register('fixedPrice', { valueAsNumber: true })}
                  className="w-full p-2 rounded-md bg-dark-bg border border-dark-border"
                  placeholder="0.00"
                  disabled={drawer.mode === 'view'}
                />
              </div>
            )}
            
            {/* Status */}
            <div>
              <Label htmlFor="status" className="text-sm font-medium mb-1">
                Status <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.watch('status')}
                onValueChange={(value) => form.setValue('status', value as 'todo' | 'in_progress' | 'completed')}
                disabled={drawer.mode === 'view'}
              >
                <SelectTrigger className="w-full bg-dark-bg border border-dark-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </form>
          
          {/* Task History (Visible only in edit/view mode) */}
          {(drawer.mode === 'edit' || drawer.mode === 'view') && drawer.taskId && (
            <TaskHistory taskId={drawer.taskId} />
          )}
          
          {/* Comments Section (Visible only in edit/view mode) */}
          {(drawer.mode === 'edit' || drawer.mode === 'view') && drawer.taskId && (
            <TaskComments 
              taskId={drawer.taskId} 
              readonly={drawer.mode === 'view'} 
            />
          )}
        </div>
        
        {/* Drawer Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-end space-x-3">
          <Button variant="secondary" onClick={closeDrawer}>
            {drawer.mode === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {drawer.mode !== 'view' && (
            <Button 
              variant="default" 
              className="bg-primary hover:bg-primary/90"
              onClick={form.handleSubmit(onSubmit)}
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Saving...' : 'Save Task'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
