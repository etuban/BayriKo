import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TaskTable } from '@/components/TaskTable';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, FolderKanban, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Task } from '@/types';

export default function TasksPage() {
  // State for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Fetch tasks with filters
  const { data: tasks, isLoading, error } = useQuery<Task[]>({
    queryKey: ['/api/tasks', searchQuery, projectFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (projectFilter) params.append('projectId', projectFilter);
      if (statusFilter) params.append('status', statusFilter);
      
      const url = `/api/tasks?${params.toString()}`;
      return fetch(url).then(res => res.json());
    },
  });

  // Fetch projects for filter dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects'],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-semibold mb-4 md:mb-0">My Tasks</h1>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative">
            <Input
              type="text"
              placeholder="Search tasks..."
              className="pl-10 pr-4 py-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
          
          {/* Project Filter */}
          <div className="relative">
            <Select
              value={projectFilter}
              onValueChange={setProjectFilter}
            >
              <SelectTrigger className="pl-10 pr-8 py-2 min-w-[180px]">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project: any) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FolderKanban className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
          
          {/* Status Filter */}
          <div className="relative">
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="pl-10 pr-8 py-2 min-w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <CheckCircle className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
        </div>
      </div>
      
      {/* Tasks Table */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error ? (
        <div className="bg-dark-surface border border-dark-border rounded-lg p-6 text-center">
          <p className="text-red-400">Error loading tasks. Please try again.</p>
        </div>
      ) : tasks && tasks.length > 0 ? (
        <TaskTable tasks={tasks} />
      ) : (
        <div className="bg-dark-surface border border-dark-border rounded-lg p-6 text-center">
          <p className="text-gray-400">No tasks found. Try adjusting your filters or create a new task.</p>
        </div>
      )}
    </div>
  );
}
