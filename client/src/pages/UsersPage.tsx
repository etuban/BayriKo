import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, UserFormValues } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, UserPlus, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { getInitials } from '@/lib/utils';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Project } from '@/types';

// Form validation schema
const userFormSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  role: z.enum(['supervisor', 'team_lead', 'staff']),
  position: z.string().optional(),
  isApproved: z.boolean().optional(),
  avatarUrl: z.string().url('Invalid URL').optional().or(z.literal(''))
});

export default function UsersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  
  // Load projects for assignment
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    enabled: user?.role === 'supervisor',
  });
  
  // Form setup
  const form = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      fullName: '',
      role: 'staff',
      position: '',
      avatarUrl: ''
    }
  });
  
  // Load users
  const { data: users = [], isLoading, error } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: user?.role === 'supervisor' || user?.role === 'team_lead',
  });
  
  // Filter users by search
  const filteredUsers = users.filter(user => 
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Create user mutation
  const createMutation = useMutation({
    mutationFn: async (userData: UserFormValues) => {
      const res = await apiRequest('POST', '/api/users', userData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: 'Success',
        description: 'User created successfully',
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive',
      });
    }
  });
  
  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: number, userData: Partial<UserFormValues> }) => {
      const res = await apiRequest('PUT', `/api/users/${id}`, userData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive',
      });
    }
  });
  
  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/users/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    }
  });
  
  // Handle form submission
  const handleCreateUser = (data: z.infer<typeof userFormSchema>) => {
    createMutation.mutate(data);
  };
  
  const handleUpdateUser = (data: z.infer<typeof userFormSchema>) => {
    if (!selectedUser) return;
    
    // Only send password if it's provided
    const userData = { ...data };
    if (!userData.password) {
      delete userData.password;
    }
    
    updateMutation.mutate({ id: selectedUser.id, userData });
  };
  
  const handleDeleteUser = () => {
    if (!selectedUser) return;
    deleteMutation.mutate(selectedUser.id);
  };
  
  // Handle user approval
  const handleApproveUser = (userId: number) => {
    updateMutation.mutate({ 
      id: userId, 
      userData: { isApproved: true } 
    });
  };

  // Open edit dialog and populate form
  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    form.reset({
      username: user.username,
      email: user.email,
      password: '',
      fullName: user.fullName,
      role: user.role,
      position: user.position || '',
      avatarUrl: user.avatarUrl || '',
      isApproved: user.isApproved
    });
    setIsEditDialogOpen(true);
  };
  
  // Open delete dialog
  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };
  
  // Reset form when opening add dialog
  const openAddDialog = () => {
    form.reset({
      username: '',
      email: '',
      password: '',
      fullName: '',
      role: 'staff',
      position: '',
      avatarUrl: ''
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
        <h1 className="text-2xl font-semibold mb-4 md:mb-0">User Management</h1>
        
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative">
            <Input
              type="text"
              placeholder="Search users..."
              className="pl-10 pr-4 py-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
          
          {/* Add User Button */}
          {canCreate && (
            <Button 
              onClick={openAddDialog}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          )}
        </div>
      </div>
      
      {/* User List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-[220px] w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-dark-surface border border-dark-border rounded-lg p-6 text-center">
          <p className="text-red-400">Error loading users. Please try again.</p>
        </div>
      ) : filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="bg-dark-surface border border-dark-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{user.fullName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start">
                  <Avatar className="h-14 w-14 mr-4">
                    <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                    <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm text-gray-400">@{user.username}</p>
                    <p className="text-sm">{user.email}</p>
                    <p className="text-sm mt-1">{user.position}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-sm px-2 py-1 rounded-full bg-primary/20 text-primary capitalize">
                        {user.role}
                      </span>
                      {user.isApproved ? (
                        <span className="text-sm px-2 py-1 rounded-full bg-green-500/20 text-green-500">
                          Approved
                        </span>
                      ) : (
                        <span className="text-sm px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-500">
                          Pending Approval
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0 flex justify-end gap-2">
                {!user.isApproved && user?.role === 'supervisor' && (
                  <Button 
                    size="sm"
                    onClick={() => handleApproveUser(user.id)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Approve
                  </Button>
                )}
                {canEdit && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openEditDialog(user)}
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                )}
                {canDelete && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => openDeleteDialog(user)}
                    disabled={user.email === 'pawnmedia.ph@gmail.com'} // Prevent deleting admin
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-dark-surface border border-dark-border rounded-lg p-6 text-center">
          <p className="text-gray-400">No users found. {canCreate ? 'Add a new user to get started.' : ''}</p>
        </div>
      )}
      
      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-dark-surface border border-dark-border">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new user account with appropriate role and permissions.</DialogDescription>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(handleCreateUser)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  {...form.register('username')}
                  className="bg-dark-bg"
                />
                {form.formState.errors.username && (
                  <p className="text-red-500 text-xs">{form.formState.errors.username.message}</p>
                )}
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
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password"
                {...form.register('password')}
                className="bg-dark-bg"
              />
              {form.formState.errors.password && (
                <p className="text-red-500 text-xs">{form.formState.errors.password.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input 
                id="fullName" 
                {...form.register('fullName')}
                className="bg-dark-bg"
              />
              {form.formState.errors.fullName && (
                <p className="text-red-500 text-xs">{form.formState.errors.fullName.message}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select 
                  value={form.watch('role')} 
                  onValueChange={(value) => form.setValue('role', value as any)}
                >
                  <SelectTrigger className="bg-dark-bg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="team_lead">Team Lead</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input 
                  id="position" 
                  {...form.register('position')}
                  className="bg-dark-bg"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="avatarUrl">Avatar URL</Label>
              <Input 
                id="avatarUrl" 
                {...form.register('avatarUrl')}
                className="bg-dark-bg"
              />
              {form.formState.errors.avatarUrl && (
                <p className="text-red-500 text-xs">{form.formState.errors.avatarUrl.message}</p>
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
                {createMutation.isPending ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-dark-surface border border-dark-border">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and permissions.</DialogDescription>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(handleUpdateUser)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  {...form.register('username')}
                  className="bg-dark-bg"
                />
                {form.formState.errors.username && (
                  <p className="text-red-500 text-xs">{form.formState.errors.username.message}</p>
                )}
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
              <Label htmlFor="password">Password (leave blank to keep unchanged)</Label>
              <Input 
                id="password" 
                type="password"
                {...form.register('password')}
                className="bg-dark-bg"
              />
              {form.formState.errors.password && (
                <p className="text-red-500 text-xs">{form.formState.errors.password.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input 
                id="fullName" 
                {...form.register('fullName')}
                className="bg-dark-bg"
              />
              {form.formState.errors.fullName && (
                <p className="text-red-500 text-xs">{form.formState.errors.fullName.message}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select 
                  value={form.watch('role')} 
                  onValueChange={(value) => form.setValue('role', value as any)}
                  disabled={user?.role !== 'supervisor'}
                >
                  <SelectTrigger className="bg-dark-bg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="team_lead">Team Lead</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input 
                  id="position" 
                  {...form.register('position')}
                  className="bg-dark-bg"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="avatarUrl">Avatar URL</Label>
              <Input 
                id="avatarUrl" 
                {...form.register('avatarUrl')}
                className="bg-dark-bg"
              />
              {form.formState.errors.avatarUrl && (
                <p className="text-red-500 text-xs">{form.formState.errors.avatarUrl.message}</p>
              )}
            </div>
            
            {user?.role === 'supervisor' && (
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="isApproved" 
                  checked={form.watch('isApproved')}
                  onCheckedChange={(checked) => form.setValue('isApproved', checked as boolean)}
                />
                <Label htmlFor="isApproved">Approve User</Label>
              </div>
            )}
            
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
                {updateMutation.isPending ? 'Updating...' : 'Update User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete User Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-dark-surface border border-dark-border">
          <AlertDialogHeader>
            <div className="flex items-center mb-2">
              <AlertCircle className="h-6 w-6 text-red-500 mr-2" />
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-gray-300">
              Are you sure you want to delete the user "{selectedUser?.fullName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="secondary">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button 
                variant="destructive" 
                onClick={handleDeleteUser}
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
