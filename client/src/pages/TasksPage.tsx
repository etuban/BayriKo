import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TaskTable } from '@/components/TaskTable';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, FolderKanban, CheckCircle, Building, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Task, Organization, Project } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useTask } from '@/context/TaskContext';
import { Button } from '@/components/ui/button';

export default function TasksPage() {
  const { user } = useAuth();
  
  // State for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedOrganization, setSelectedOrganization] = useState<number | null>(null);

  // Load user's organizations
  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ['/api/users/organizations/current'],
    enabled: !!user,
  });
  
  // Set default organization based on user's current organization if available
  useEffect(() => {
    if (organizations.length > 0 && !selectedOrganization) {
      // Use the user's current organization if available
      if (user?.currentOrganizationId) {
        setSelectedOrganization(user.currentOrganizationId);
      } else {
        // Otherwise use the first organization
        setSelectedOrganization(organizations[0]?.id || null);
      }
    }
  }, [organizations, user]);

  // Fetch projects for filter dropdown, filtered by organization
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects', selectedOrganization],
    queryFn: async () => {
      let url = '/api/projects';
      if (selectedOrganization) {
        url += `?organizationId=${selectedOrganization}`;
      }
      const res = await fetch(url);
      return res.json();
    },
    enabled: !!selectedOrganization,
  });

  // Get project IDs from the user's organization
  const organizationProjectIds = projects ? projects.map((project: Project) => project.id) : [];
  
  // Fetch tasks with filters
  const { data: allTasks = [], isLoading, error } = useQuery<Task[]>({
    queryKey: ['/api/tasks', searchQuery, projectFilter, statusFilter, selectedOrganization],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (projectFilter && projectFilter !== 'all') params.append('projectId', projectFilter);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (selectedOrganization) params.append('organizationId', selectedOrganization.toString());
      
      const url = `/api/tasks?${params.toString()}`;
      return fetch(url).then(res => res.json());
    },
    enabled: !!selectedOrganization,
  });
  
  // Filter tasks to only include those from projects in the user's organization
  const tasks = allTasks.filter(task => 
    // Include if user selected a specific project in their org
    (projectFilter && projectFilter !== 'all' && task.projectId === parseInt(projectFilter, 10)) ||
    // Or if the task belongs to any project in the user's organization
    (!projectFilter || projectFilter === 'all') && organizationProjectIds.includes(task.projectId)
  );

  // Access task context
  const { openDrawer } = useTask();
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold mb-4 md:mb-0">My Tasks</h1>
          <Button 
            onClick={() => openDrawer('new')}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            <Plus className="mr-2 h-4 w-4" /> New Task
          </Button>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Organization Selector (visible to supervisors, team leads, and super admins) */}
          {organizations.length > 1 && (user?.role === 'super_admin' || user?.role === 'supervisor' || user?.role === 'team_lead') && (
            <div className="w-[200px]">
              <Select 
                value={selectedOrganization?.toString() || ''}
                onValueChange={(value) => setSelectedOrganization(parseInt(value, 10))}
              >
                <SelectTrigger className="h-10 bg-dark-bg border-dark-border">
                  <div className="flex items-center">
                    <Building className="w-4 h-4 mr-2 text-primary" />
                    <SelectValue placeholder="Select organization" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {organizations.map(org => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
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
                {projects && projects.map((project: Project) => (
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
