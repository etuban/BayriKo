import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Building, 
  Plus, 
  Pencil, 
  Trash2, 
  AlertCircle, 
  Users, 
  Briefcase 
} from 'lucide-react';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Define types for Organization
interface Organization {
  id: number;
  name: string;
  description?: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  createdAt: string;
  updatedAt: string;
  userCount?: number;
  projectCount?: number;
}

// Form validation schema for organization
const organizationFormSchema = z.object({
  name: z.string().min(3, 'Organization name must be at least 3 characters'),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
});

type OrganizationFormValues = z.infer<typeof organizationFormSchema>;

export default function OrganizationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  
  // Form setup
  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: '',
      description: '',
      address: '',
      phone: '',
      email: '',
      website: '',
    }
  });
  
  // Load organizations
  const { data: organizations = [], isLoading, error } = useQuery<Organization[]>({
    queryKey: ['/api/organizations'],
  });
  
  // Filter organizations by search
  const filteredOrganizations = organizations.filter(org => 
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (org.description && org.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  // Create organization mutation
  const createMutation = useMutation({
    mutationFn: async (orgData: OrganizationFormValues) => {
      const res = await apiRequest('POST', '/api/organizations', orgData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      toast({
        title: 'Success',
        description: 'Organization created successfully',
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create organization',
        variant: 'destructive',
      });
    }
  });
  
  // Update organization mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, orgData }: { id: number, orgData: Partial<OrganizationFormValues> }) => {
      const res = await apiRequest('PUT', `/api/organizations/${id}`, orgData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      toast({
        title: 'Success',
        description: 'Organization updated successfully',
      });
      setIsEditDialogOpen(false);
      setSelectedOrganization(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update organization',
        variant: 'destructive',
      });
    }
  });
  
  // Delete organization mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/organizations/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      toast({
        title: 'Success',
        description: 'Organization deleted successfully',
      });
      setIsDeleteDialogOpen(false);
      setSelectedOrganization(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete organization. Make sure there are no users or projects associated with this organization.',
        variant: 'destructive',
      });
    }
  });
  
  // Handle form submission
  const handleCreateOrganization = (data: OrganizationFormValues) => {
    createMutation.mutate(data);
  };
  
  const handleUpdateOrganization = (data: OrganizationFormValues) => {
    if (!selectedOrganization) return;
    updateMutation.mutate({ id: selectedOrganization.id, orgData: data });
  };
  
  const handleDeleteOrganization = () => {
    if (!selectedOrganization) return;
    deleteMutation.mutate(selectedOrganization.id);
  };
  
  // Open edit dialog and populate form
  const openEditDialog = (organization: Organization) => {
    setSelectedOrganization(organization);
    form.reset({
      name: organization.name,
      description: organization.description || '',
      address: organization.address || '',
      phone: organization.phone || '',
      email: organization.email || '',
      website: organization.website || '',
    });
    setIsEditDialogOpen(true);
  };
  
  // Open delete dialog
  const openDeleteDialog = (organization: Organization) => {
    setSelectedOrganization(organization);
    setIsDeleteDialogOpen(true);
  };
  
  // Reset form when opening add dialog
  const openAddDialog = () => {
    form.reset({
      name: '',
      description: '',
      address: '',
      phone: '',
      email: '',
      website: '',
    });
    setIsAddDialogOpen(true);
  };
  
  // Check if the current user can perform actions
  const canManageOrgs = user?.role === 'super_admin' || user?.role === 'supervisor';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-semibold mb-4 md:mb-0">Organizations</h1>
        
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative">
            <Input
              type="text"
              placeholder="Search organizations..."
              className="pl-10 pr-4 py-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
          
          {/* Add Organization Button */}
          {canManageOrgs && (
            <Button 
              onClick={openAddDialog}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Organization
            </Button>
          )}
        </div>
      </div>
      
      {/* Organization List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-[220px] w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-dark-surface border border-dark-border rounded-lg p-6 text-center">
          <p className="text-red-400">Error loading organizations. Please try again.</p>
        </div>
      ) : filteredOrganizations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrganizations.map((org) => (
            <Card key={org.id} className="bg-dark-surface border border-dark-border">
              <CardHeader className="pb-2">
                <div className="flex items-center mb-2">
                  <Building className="h-5 w-5 text-primary mr-2" />
                  <CardTitle className="text-lg">{org.name}</CardTitle>
                </div>
                {org.description && (
                  <CardDescription>{org.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-400">
                  {org.address && (
                    <p>Address: {org.address}</p>
                  )}
                  {org.phone && (
                    <p>Phone: {org.phone}</p>
                  )}
                  {org.email && (
                    <p>Email: {org.email}</p>
                  )}
                  {org.website && (
                    <p>Website: <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{org.website}</a></p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{org.userCount || 0} Users</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    <span>{org.projectCount || 0} Projects</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0 flex justify-end gap-2">
                {canManageOrgs && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openEditDialog(org)}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    {user?.role === 'super_admin' && (
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => openDeleteDialog(org)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    )}
                  </>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-dark-surface border border-dark-border rounded-lg p-6 text-center">
          <p className="text-gray-400">No organizations found. {canManageOrgs ? 'Create a new organization to get started.' : ''}</p>
        </div>
      )}
      
      {/* Add Organization Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-dark-surface border border-dark-border">
          <DialogHeader>
            <DialogTitle>New Organization</DialogTitle>
            <DialogDescription>Create a new organization for managing users and projects.</DialogDescription>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(handleCreateOrganization)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name*</Label>
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
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input 
                id="address" 
                {...form.register('address')}
                className="bg-dark-bg"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input 
                  id="phone" 
                  {...form.register('phone')}
                  className="bg-dark-bg"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email"
                  {...form.register('email')}
                  className="bg-dark-bg"
                />
                {form.formState.errors.email && (
                  <p className="text-red-500 text-xs">{form.formState.errors.email.message}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input 
                id="website" 
                {...form.register('website')}
                className="bg-dark-bg"
                placeholder="https://example.com"
              />
              {form.formState.errors.website && (
                <p className="text-red-500 text-xs">{form.formState.errors.website.message}</p>
              )}
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
                {createMutation.isPending ? 'Creating...' : 'Create Organization'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Organization Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-dark-surface border border-dark-border">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>Update organization details.</DialogDescription>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(handleUpdateOrganization)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name*</Label>
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
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input 
                id="address" 
                {...form.register('address')}
                className="bg-dark-bg"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input 
                  id="phone" 
                  {...form.register('phone')}
                  className="bg-dark-bg"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email"
                  {...form.register('email')}
                  className="bg-dark-bg"
                />
                {form.formState.errors.email && (
                  <p className="text-red-500 text-xs">{form.formState.errors.email.message}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input 
                id="website" 
                {...form.register('website')}
                className="bg-dark-bg"
                placeholder="https://example.com"
              />
              {form.formState.errors.website && (
                <p className="text-red-500 text-xs">{form.formState.errors.website.message}</p>
              )}
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
                {updateMutation.isPending ? 'Updating...' : 'Update Organization'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Organization Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-dark-surface border border-dark-border">
          <AlertDialogHeader>
            <div className="flex items-center mb-2">
              <AlertCircle className="h-6 w-6 text-red-500 mr-2" />
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-gray-300">
              Are you sure you want to delete the organization "{selectedOrganization?.name}"? This action cannot be undone.
              <br /><br />
              <strong className="text-yellow-400">Note:</strong> You cannot delete an organization that has users or projects associated with it. Remove or reassign all users and projects first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="secondary">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button 
                variant="destructive" 
                onClick={handleDeleteOrganization}
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