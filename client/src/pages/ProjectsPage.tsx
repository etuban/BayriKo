import React, { useState } from 'react';
import { Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Project, ProjectFormValues, Organization } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Folder, Plus, Pencil, Trash2, AlertCircle, ListTodo, Building } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Form validation schema
const projectFormSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters'),
  description: z.string().optional()
});

export default function ProjectsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<number | null>(null);
  
  // Form setup
  const form = useForm<z.infer<typeof projectFormSchema>>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      description: ''
    }
  });
  
  // Load user's organizations
  const { data: organizations = [], isLoading: orgsLoading } = useQuery<Organization[]>({
    queryKey: ['/api/users/organizations'],
  });
  
  // Set default organization based on user's current organization if available
  React.useEffect(() => {
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
  
  // Load projects filtered by organization
  const { data: projects = [], isLoading, error } = useQuery<Project[]>({
    queryKey: ['/api/projects', selectedOrganization],
    queryFn: async () => {
      let url = '/api/projects';
      if (selectedOrganization) {
        url += `?organizationId=${selectedOrganization}`;
      }
      const res = await apiRequest('GET', url);
      return res.json();
    },
    enabled: !!selectedOrganization || user?.role === 'super_admin',
  });
  
  // Filter projects by search
  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  // Create project mutation
  const createMutation = useMutation({
    mutationFn: async (projectData: ProjectFormValues) => {
      // Include organization ID in the project data
      const projectWithOrg = {
        ...projectData,
        organizationId: selectedOrganization
      };
      const res = await apiRequest('POST', '/api/projects', projectWithOrg);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', selectedOrganization] });
      toast({
        title: 'Success',
        description: 'Project created successfully',
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create project',
        variant: 'destructive',
      });
    }
  });
  
  // Update project mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, projectData }: { id: number, projectData: Partial<ProjectFormValues> }) => {
      const res = await apiRequest('PUT', `/api/projects/${id}`, projectData);
      return res.json();
    },
    onSuccess: () => {
      // Invalidate all project queries and the specific organization query
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      if (selectedOrganization) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', selectedOrganization] });
      }
      toast({
        title: 'Success',
        description: 'Project updated successfully',
      });
      setIsEditDialogOpen(false);
      setSelectedProject(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update project',
        variant: 'destructive',
      });
    }
  });
  
  // Delete project mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/projects/${id}`, {});
    },
    onSuccess: () => {
      // Invalidate all project queries and the specific organization query
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      if (selectedOrganization) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', selectedOrganization] });
      }
      toast({
        title: 'Success',
        description: 'Project deleted successfully',
      });
      setIsDeleteDialogOpen(false);
      setSelectedProject(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete project. Make sure there are no tasks associated with this project.',
        variant: 'destructive',
      });
    }
  });
  
  // Handle form submission
  const handleCreateProject = (data: z.infer<typeof projectFormSchema>) => {
    createMutation.mutate(data);
  };
  
  const handleUpdateProject = (data: z.infer<typeof projectFormSchema>) => {
    if (!selectedProject) return;
    updateMutation.mutate({ id: selectedProject.id, projectData: data });
  };
  
  const handleDeleteProject = () => {
    if (!selectedProject) return;
    deleteMutation.mutate(selectedProject.id);
  };
  
  // Open edit dialog and populate form
  const openEditDialog = (project: Project) => {
    setSelectedProject(project);
    form.reset({
      name: project.name,
      description: project.description || ''
    });
    setIsEditDialogOpen(true);
  };
  
  // Open delete dialog
  const openDeleteDialog = (project: Project) => {
    setSelectedProject(project);
    setIsDeleteDialogOpen(true);
  };
  
  // Reset form when opening add dialog
  const openAddDialog = () => {
    form.reset({
      name: '',
      description: ''
    });
    setIsAddDialogOpen(true);
  };
  
  // Check if the current user can perform actions
  const canDelete = user?.role === 'supervisor';
  const canEdit = user?.role === 'supervisor' || user?.role === 'team_lead';
  const canCreate = user?.role === 'supervisor' || user?.role === 'team_lead';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-semibold mb-4 md:mb-0">Projects</h1>
        
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
              placeholder="Search projects..."
              className="pl-10 pr-4 py-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
          
          {/* Add Project Button */}
          {canCreate && (
            <Button 
              onClick={openAddDialog}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          )}
        </div>
      </div>
      
      {/* Project List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-[200px] w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-dark-surface border border-dark-border rounded-lg p-6 text-center">
          <p className="text-red-400">Error loading projects. Please try again.</p>
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="bg-dark-surface border border-dark-border">
              <CardHeader className="pb-2">
                <div className="flex items-center mb-2">
                  <Folder className="h-5 w-5 text-primary mr-2" />
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                </div>
                {project.description && (
                  <CardDescription>{project.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-1 text-sm text-gray-400">
                  <div className="flex items-center justify-between">
                    <div>Created by: {project.creator?.fullName || 'Unknown'}</div>
                    <div>{project.taskCount || 0} Tasks</div>
                  </div>
                  {project.organization && (
                    <div className="flex items-center text-primary/80">
                      <Building className="h-3.5 w-3.5 mr-1" />
                      {project.organization.name}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-0 flex justify-between gap-2">
                <Link href={`/tasks?projectId=${project.id}`}>
                  <Button 
                    variant="default" 
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                  >
                    <ListTodo className="w-4 h-4 mr-1" />
                    View Tasks
                  </Button>
                </Link>
                
                <div className="flex gap-2">
                  {canEdit && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openEditDialog(project)}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  )}
                  {canDelete && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => openDeleteDialog(project)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-dark-surface border border-dark-border rounded-lg p-6 text-center">
          <p className="text-gray-400">No projects found. {canCreate ? 'Create a new project to get started.' : ''}</p>
        </div>
      )}
      
      {/* Add Project Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-dark-surface border border-dark-border">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>
              Create a new project for organizing tasks.
              {selectedOrganization && organizations.length > 0 && (
                <div className="mt-2 flex items-center">
                  <span className="text-sm text-primary font-medium flex items-center">
                    <Building className="h-4 w-4 mr-1" />
                    Organization: {organizations.find(org => org.id === selectedOrganization)?.name}
                  </span>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(handleCreateProject)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input 
                id="name" 
                {...form.register('name')}
                className="bg-dark-bg"
              />
              {form.formState.errors.name && (
                <p className="text-red-500 text-xs">{form.formState.errors.name.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                {...form.register('description')}
                className="bg-dark-bg"
                rows={4}
              />
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-primary hover:bg-primary/90"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Project'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-dark-surface border border-dark-border">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update project details.</DialogDescription>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(handleUpdateProject)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input 
                id="name" 
                {...form.register('name')}
                className="bg-dark-bg"
              />
              {form.formState.errors.name && (
                <p className="text-red-500 text-xs">{form.formState.errors.name.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                {...form.register('description')}
                className="bg-dark-bg"
                rows={4}
              />
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-primary hover:bg-primary/90"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Updating...' : 'Update Project'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Project Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-dark-surface border border-dark-border">
          <AlertDialogHeader>
            <div className="flex items-center mb-2">
              <AlertCircle className="h-6 w-6 text-red-500 mr-2" />
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-gray-300">
              Are you sure you want to delete the project "{selectedProject?.name}"? This action cannot be undone.
              <br /><br />
              <strong className="text-yellow-400">Note:</strong> You cannot delete a project that has tasks associated with it. Delete or reassign all tasks first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="secondary">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button 
                variant="destructive" 
                onClick={handleDeleteProject}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
