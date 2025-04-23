import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, UserFormValues, Organization, Project } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useTask } from '@/context/TaskContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, UserPlus, Pencil, Trash2, AlertCircle, X, Building, Loader2, 
  Calendar, Users, Link, LinkIcon, Copy, Mail, ClipboardList
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { getInitials } from '@/lib/utils';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// Form validation schema
const userFormSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  role: z.enum(['super_admin', 'supervisor', 'team_lead', 'staff']),
  position: z.string().optional(),
  isApproved: z.boolean().optional(),
  avatarUrl: z.string().url('Invalid URL').optional().or(z.literal(''))
});

// Interface for InvitationLink
interface InvitationLink {
  id: number;
  organizationId: number;
  token: string;
  role: 'supervisor' | 'team_lead' | 'staff';
  expires: string | null;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  message: string;
  createdById: number;
  createdAt: string;
  organization?: {
    name: string;
  };
}

// Form validation schema for invitation link
const invitationLinkSchema = z.object({
  role: z.enum(['supervisor', 'team_lead', 'staff']),
  expires: z.string().optional().nullable(),
  maxUses: z.coerce.number().optional().nullable(),
  message: z.string().min(1, 'Message is required'),
  organizationId: z.number({
    required_error: "Organization ID is required",
    invalid_type_error: "Organization ID must be a number",
  }),
  sendEmail: z.boolean().default(false),
  recipientEmail: z.string().email('Please enter a valid email').optional(),
}).refine(
  (data) => {
    // If sendEmail is true, email must be provided
    return !data.sendEmail || (data.sendEmail && !!data.recipientEmail);
  },
  {
    message: 'Email is required when sending invitation by email',
    path: ['recipientEmail']
  }
);

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
  const [selectedOrganization, setSelectedOrganization] = useState<number | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [organizationsLoading, setOrganizationsLoading] = useState(false);
  const [isInvitationDialogOpen, setIsInvitationDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  
  // Load projects for assignment
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    enabled: !!user && (user.role === 'supervisor' || user.role === 'super_admin'),
  });
  
  // Load organizations for super admin
  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ['/api/organizations'],
    enabled: !!user && (user.role === 'super_admin' || user.role === 'supervisor'),
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
  
  // Invitation form setup
  const invitationForm = useForm<z.infer<typeof invitationLinkSchema>>({
    resolver: zodResolver(invitationLinkSchema),
    defaultValues: {
      role: 'staff',
      message: "You've been invited to join our organization.",
      expires: null,
      maxUses: null,
      organizationId: user?.currentOrganizationId || 0,
      sendEmail: false,
      recipientEmail: ''
    }
  });

  // Set default organization for invitation form
  useEffect(() => {
    if (user?.currentOrganizationId && organizations.length > 0) {
      invitationForm.setValue('organizationId', user.currentOrganizationId);
    } else if (organizations.length > 0) {
      invitationForm.setValue('organizationId', organizations[0].id);
    }
  }, [user, organizations, invitationForm]);
  
  // Load users
  const { data: users = [], isLoading, error } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: !!user && (user.role === 'super_admin' || user.role === 'supervisor' || user.role === 'team_lead'),
  });

  // Load invitation links
  const { data: invitationLinks = [], isLoading: isInvitationsLoading } = useQuery<InvitationLink[]>({
    queryKey: ['/api/organizations', user?.currentOrganizationId, 'invitations'],
    queryFn: async () => {
      if (!user?.currentOrganizationId) return [];
      console.log(`Fetching invitations for organization: ${user.currentOrganizationId}`);
      try {
        const res = await apiRequest('GET', `/api/organizations/${user.currentOrganizationId}/invitations`);
        const data = await res.json();
        console.log('Invitation data:', data);
        return data;
      } catch (error) {
        console.error('Error fetching invitations:', error);
        return [];
      }
    },
    enabled: !!user && (user.role === 'super_admin' || user.role === 'supervisor') && !!user.currentOrganizationId,
  });
  
  // Filter users by search
  const filteredUsers = users.filter(user => 
    user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

  // Create invitation link mutation
  const createInvitationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof invitationLinkSchema>) => {
      try {
        console.log('Making invitation API request with data:', JSON.stringify(data));
        
        // Extra validation before API call
        if (!data.organizationId) {
          throw new Error('Organization ID is required but missing');
        }
        
        const res = await apiRequest('POST', '/api/invitations', data);
        console.log('API response status:', res.status);
        
        if (!res.ok) {
          let errorMessage = 'Failed to create invitation link';
          try {
            const errorData = await res.json();
            console.error('API error response:', errorData);
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            console.error('Could not parse error response:', e);
          }
          throw new Error(errorMessage);
        }
        
        const responseData = await res.json();
        console.log('Success response:', responseData);
        return responseData;
      } catch (error) {
        console.error('Invitation creation error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Invitation created successfully:', data);
      queryClient.invalidateQueries({ 
        queryKey: ['/api/organizations', user?.currentOrganizationId, 'invitations'] 
      });
      toast({
        title: 'Success',
        description: 'Invitation link created successfully',
      });
      setIsInvitationDialogOpen(false);
      invitationForm.reset({
        role: 'staff',
        message: "You've been invited to join our organization.",
        expires: null,
        maxUses: null,
        organizationId: user?.currentOrganizationId || organizations[0]?.id || 0,
        sendEmail: false,
        recipientEmail: ''
      });
    },
    onError: (error: any) => {
      console.error('Mutation error handler:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create invitation link',
        variant: 'destructive',
      });
    }
  });

  // Delete invitation link mutation
  const deleteInvitationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/invitations/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/organizations', user?.currentOrganizationId, 'invitations'] 
      });
      toast({
        title: 'Success',
        description: 'Invitation link deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete invitation link',
        variant: 'destructive',
      });
    }
  });
  
  // Handle form submission
  const handleCreateUser = (data: z.infer<typeof userFormSchema>) => {
    createMutation.mutate(data);
  };

  // Handle invitation link creation
  const handleCreateInvitation = (data: z.infer<typeof invitationLinkSchema>) => {
    console.log('Submitting invitation data:', data);
    
    // Ensure organizationId is present and valid
    if (!data.organizationId && user?.currentOrganizationId) {
      console.log('Setting missing organizationId to currentOrganizationId:', user.currentOrganizationId);
      data.organizationId = user.currentOrganizationId;
    }
    
    // Final validation before sending
    if (!data.organizationId) {
      console.error('No organization ID available');
      toast({
        title: 'Error',
        description: 'Organization ID is required. Please select an organization.',
        variant: 'destructive',
      });
      return;
    }
    
    // Log full data before submission
    console.log('Final invitation data to submit:', data);
    createInvitationMutation.mutate(data);
  };

  // Copy invitation link to clipboard
  const copyInvitationLink = (token: string) => {
    const baseUrl = window.location.origin;
    const invitationUrl = `${baseUrl}/register?token=${token}`;
    
    navigator.clipboard.writeText(invitationUrl);
    
    toast({
      title: 'Copied!',
      description: 'Invitation link copied to clipboard.',
    });
  };
  
  const handleUpdateUser = (data: z.infer<typeof userFormSchema>) => {
    if (!selectedUser) return;
    
    // Only send password if it's provided
    const userData = { ...data };
    if (!userData.password) {
      delete userData.password;
    }
    
    // Update user details first
    updateMutation.mutate({ 
      id: selectedUser.id, 
      userData: {
        ...userData,
      }
    });
    
    // If user is staff and supervisor or super_admin is making changes, also update project assignments
    if ((user?.role === 'supervisor' || user?.role === 'super_admin') && userData.role === 'staff') {
      assignProjectsMutation.mutate({
        userId: selectedUser.id,
        projectIds: selectedProjects
      });
    }
  };
  
  const handleDeleteUser = () => {
    if (!selectedUser) return;
    deleteMutation.mutate(selectedUser.id);
  };
  
  // Approval dialog state
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  
  // Handle user approval
  const handleApproveUser = (userId: number) => {
    // First update user approval status
    updateMutation.mutate({ 
      id: userId, 
      userData: { isApproved: true } 
    });
    
    // Then assign selected projects if user is staff
    if (selectedUser?.role === 'staff' && selectedProjects.length > 0) {
      assignProjectsMutation.mutate({
        userId,
        projectIds: selectedProjects
      });
    }
    
    // Close approval dialog if open
    setIsApproveDialogOpen(false);
  };
  
  // Open approval dialog
  const openApproveDialog = async (user: User) => {
    setSelectedUser(user);
    // Reset selected projects
    setSelectedProjects([]);
    // Fetch user's assigned projects to populate selection
    if (user.role === 'staff') {
      await fetchUserProjects(user.id);
    }
    setIsApproveDialogOpen(true);
  };

  // Fetch user projects
  const fetchUserProjects = async (userId: number) => {
    if (user?.role === 'supervisor' || user?.role === 'super_admin') {
      setProjectsLoading(true);
      try {
        const res = await apiRequest('GET', `/api/users/${userId}/projects`);
        const userProjects = await res.json();
        setSelectedProjects(userProjects.map((p: Project) => p.id));
      } catch (error) {
        console.error('Error fetching user projects:', error);
        toast({
          title: 'Error',
          description: 'Failed to load user projects',
          variant: 'destructive',
        });
        setSelectedProjects([]);
      } finally {
        setProjectsLoading(false);
      }
    }
  };

  // Project assignment mutation
  const assignProjectsMutation = useMutation({
    mutationFn: async ({ userId, projectIds }: { userId: number, projectIds: number[] }) => {
      const res = await apiRequest('POST', `/api/users/${userId}/projects`, { projectIds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: 'Success',
        description: 'Projects assigned successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign projects',
        variant: 'destructive',
      });
    }
  });
  
  // Organization assignment mutation (for super admin)
  const assignOrganizationMutation = useMutation({
    mutationFn: async ({ userId, organizationId }: { userId: number, organizationId: number }) => {
      const res = await apiRequest('POST', `/api/users/${userId}/organizations`, { organizationId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', selectedUser?.id, 'organizations'] });
      toast({
        title: 'Success',
        description: 'User assigned to organization successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign user to organization',
        variant: 'destructive',
      });
    }
  });
  
  // Fetch user organizations
  const fetchUserOrganizations = async (userId: number) => {
    if (user?.role === 'super_admin') {
      setOrganizationsLoading(true);
      try {
        const res = await apiRequest('GET', `/api/users/${userId}/organizations`);
        const userOrgs = await res.json();
        if (userOrgs.length > 0) {
          setSelectedOrganization(userOrgs[0].id);
        } else {
          setSelectedOrganization(null);
        }
      } catch (error) {
        console.error('Error fetching user organizations:', error);
        toast({
          title: 'Error',
          description: 'Failed to load user organizations',
          variant: 'destructive',
        });
        setSelectedOrganization(null);
      } finally {
        setOrganizationsLoading(false);
      }
    }
  };

  // Open edit dialog and populate form
  const openEditDialog = async (user: User) => {
    setSelectedUser(user);
    form.reset({
      username: user.username,
      email: user.email,
      password: '',
      fullName: user.fullName || '',
      role: user.role,
      position: user.position || '',
      avatarUrl: user.avatarUrl || '',
      isApproved: user.isApproved
    });
    
    // Fetch user's assigned projects
    await fetchUserProjects(user.id);
    
    // Fetch user's organization if super admin
    if (user?.role === 'super_admin') {
      await fetchUserOrganizations(user.id);
    }
    
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
  
  // Task creation hooks
  const { openDrawer } = useTask();
  const [location, navigate] = useLocation();
  
  // Function to assign a task to a user
  const assignTaskToUser = (user: User) => {
    // Navigate to tasks page and open drawer with the user pre-selected
    navigate('/tasks');
    
    // Wait for navigation to complete, then open the task drawer
    setTimeout(() => {
      openDrawer('new');
      
      // The user will be pre-selected in the task form
      // The TaskDrawer component would need to handle this via the context
      sessionStorage.setItem('preselectedUserId', user.id.toString());
    }, 100);
  };
  
  // Check if the current user can perform actions
  const canDelete = user?.role === 'super_admin' || user?.role === 'supervisor';
  const canEdit = user?.role === 'super_admin' || user?.role === 'supervisor' || user?.role === 'team_lead';
  const canCreate = user?.role === 'super_admin' || user?.role === 'supervisor' || user?.role === 'team_lead';
  const canAssignTask = user?.role === 'super_admin' || user?.role === 'supervisor' || user?.role === 'team_lead';

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

          {/* Add Invitation Link Button - For Supervisors and Super Admin */}
          {(user?.role === 'supervisor' || user?.role === 'super_admin') && (
            <Button 
              onClick={() => setIsInvitationDialogOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <LinkIcon className="w-4 h-4 mr-2" />
              Create Invitation
            </Button>
          )}
          
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
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
          {(user?.role === 'supervisor' || user?.role === 'super_admin') && (
            <TabsTrigger value="invitations">
              <LinkIcon className="w-4 h-4 mr-2" />
              Invitation Links
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="users" className="space-y-6">
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
                        <AvatarImage src={user.avatarUrl} alt={user.fullName || ''} />
                        <AvatarFallback>{getInitials(user.fullName || user.username)}</AvatarFallback>
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
                  <CardFooter className="pt-0 flex flex-wrap justify-end gap-2">
                    {/* Assign Task Button - Only for approved users */}
                    {user.isApproved && canAssignTask && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => assignTaskToUser(user)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <ClipboardList className="w-4 h-4 mr-1" />
                        Assign Task
                      </Button>
                    )}
                    
                    {/* Approve Button */}
                    {!user.isApproved && (
                      <Button 
                        size="sm"
                        onClick={() => openApproveDialog(user)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Approve
                      </Button>
                    )}
                    
                    {/* Edit Button */}
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
                    
                    {/* Delete Button */}
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
        </TabsContent>

        {/* Invitation Links Tab */}
        <TabsContent value="invitations" className="space-y-6">
          {isInvitationsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map(i => (
                <Skeleton key={i} className="h-[180px] w-full" />
              ))}
            </div>
          ) : invitationLinks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {invitationLinks.map((invitation) => (
                <Card key={invitation.id} className="bg-dark-surface border border-dark-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-md flex items-center justify-between">
                      <div className="flex items-center">
                        <LinkIcon className="h-4 w-4 mr-2 text-primary" />
                        <span>Invitation Link</span>
                      </div>
                      <span className="text-sm px-2 py-1 rounded-full bg-primary/20 text-primary capitalize">
                        {invitation.role}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm truncate max-w-[200px]">
                        <span className="text-gray-400">{window.location.origin}/register?token={invitation.token}</span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyInvitationLink(invitation.token)}
                        className="ml-2"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <div className="border p-3 rounded-md bg-muted/30">
                        <p className="whitespace-pre-wrap">{invitation.message}</p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-4 text-xs text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {invitation.expires 
                          ? `Expires: ${new Date(invitation.expires).toLocaleDateString()}`
                          : "Never expires"}
                      </div>
                      <div className="flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        {invitation.maxUses 
                          ? `Usage: ${invitation.usedCount}/${invitation.maxUses}`
                          : `Used ${invitation.usedCount} times`}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 flex justify-end">
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => deleteInvitationMutation.mutate(invitation.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-dark-surface border border-dark-border rounded-lg p-6 text-center">
              <p className="text-gray-400">No invitation links found. Create a new invitation link to get started.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
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
      
      {/* Create Invitation Dialog */}
      <Dialog open={isInvitationDialogOpen} onOpenChange={setIsInvitationDialogOpen}>
        <DialogContent className="bg-dark-surface border border-dark-border">
          <DialogHeader>
            <DialogTitle>Create Invitation Link</DialogTitle>
            <DialogDescription>
              Create a shareable invitation link for new users to join your organization.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...invitationForm}>
            <form onSubmit={invitationForm.handleSubmit(handleCreateInvitation)} className="space-y-4">
              {/* Organization selection - only for super admins */}
              {user?.role === 'super_admin' && (
                <FormField
                  control={invitationForm.control}
                  name="organizationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization</FormLabel>
                      <Select 
                        value={field.value?.toString() || ''} 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        disabled={organizations.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-dark-bg">
                            <SelectValue placeholder="Select organization" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {organizations.map(org => (
                            <SelectItem key={org.id} value={org.id.toString()}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The organization this invitation is for
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={invitationForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invited User Role</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-dark-bg">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="team_lead">Team Lead</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The role determines what permissions the user will have in the organization
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={invitationForm.control}
                  name="expires"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiration Date (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          value={field.value || ''}
                          min={new Date().toISOString().split('T')[0]}
                          className="bg-dark-bg"
                        />
                      </FormControl>
                      <FormDescription>
                        Leave empty for no expiration
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={invitationForm.control}
                  name="maxUses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Uses (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1}
                          placeholder="Unlimited"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === '' ? null : parseInt(value));
                          }}
                          className="bg-dark-bg"
                        />
                      </FormControl>
                      <FormDescription>
                        Leave empty for unlimited uses
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={invitationForm.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invitation Message</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter the message you want to send with the invitation"
                        className="min-h-[100px] bg-dark-bg"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This message will be displayed to the user when they use the invitation link
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={invitationForm.control}
                name="sendEmail"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-2 rounded-md border">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Send Invitation via Email</FormLabel>
                      <FormDescription>
                        Send this invitation link directly to a recipient via email
                      </FormDescription>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {invitationForm.watch('sendEmail') && (
                <FormField
                  control={invitationForm.control}
                  name="recipientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipient Email</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter recipient email address"
                          {...field}
                          className="bg-dark-bg"
                        />
                      </FormControl>
                      <FormDescription>
                        The email address to send the invitation link to
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setIsInvitationDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-primary hover:bg-primary/90"
                  disabled={createInvitationMutation.isPending}
                >
                  {createInvitationMutation.isPending ? 'Creating...' : 'Create Invitation'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
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
              <Label htmlFor="password">Password (leave blank to keep current)</Label>
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
                    {user?.role === 'super_admin' && (
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    )}
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
            
            {/* Project assignment for staff users */}
            {form.watch('role') === 'staff' && (user?.role === 'supervisor' || user?.role === 'super_admin') && (
              <div className="space-y-2">
                <Label>Assigned Projects</Label>
                {projectsLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading projects...</span>
                  </div>
                ) : projects.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4 border rounded-md bg-dark-bg">
                    {projects.map(project => (
                      <div key={project.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`project-${project.id}`}
                          checked={selectedProjects.includes(project.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedProjects(prev => [...prev, project.id]);
                            } else {
                              setSelectedProjects(prev => prev.filter(id => id !== project.id));
                            }
                          }}
                        />
                        <Label htmlFor={`project-${project.id}`} className="cursor-pointer">
                          {project.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No projects available.</p>
                )}
              </div>
            )}
            
            {/* Organization assignment for super admin */}
            {user?.role === 'super_admin' && selectedUser && (
              <div className="space-y-2">
                <Label>Assign to Organization</Label>
                <p className="text-sm text-gray-400 mb-2">
                  Assign this user to an organization.
                </p>
                {organizationsLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading organizations...</span>
                  </div>
                ) : organizations.length > 0 ? (
                  <div className="space-y-2">
                    <Select 
                      value={selectedOrganization?.toString() || ''} 
                      onValueChange={(value) => setSelectedOrganization(parseInt(value))}
                    >
                      <SelectTrigger className="bg-dark-bg">
                        <SelectValue placeholder="Select an organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.map(org => (
                          <SelectItem key={org.id} value={org.id.toString()}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (selectedOrganization && selectedUser) {
                          assignOrganizationMutation.mutate({
                            userId: selectedUser.id,
                            organizationId: selectedOrganization
                          });
                        }
                      }}
                      disabled={!selectedOrganization || assignOrganizationMutation.isPending}
                      className="mt-2"
                    >
                      {assignOrganizationMutation.isPending ? 'Assigning...' : 'Assign to Organization'}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-red-400">No organizations available.</p>
                )}
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
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Approve User Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="bg-dark-surface border border-dark-border">
          <DialogHeader>
            <DialogTitle>Approve User</DialogTitle>
            <DialogDescription>
              Approve this user and assign them to projects if needed.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarImage src={selectedUser.avatarUrl} alt={selectedUser.fullName || ''} />
                  <AvatarFallback>{getInitials(selectedUser.fullName || selectedUser.username)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{selectedUser.fullName}</h3>
                  <p className="text-sm text-gray-400">{selectedUser.email}</p>
                  <p className="text-sm capitalize">{selectedUser.role}</p>
                </div>
              </div>
              
              {selectedUser.role === 'staff' && (
                <div className="space-y-2">
                  <Label>Assign to Projects</Label>
                  {projectsLoading ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading projects...</span>
                    </div>
                  ) : projects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4 border rounded-md bg-dark-bg">
                      {projects.map(project => (
                        <div key={project.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`approve-project-${project.id}`}
                            checked={selectedProjects.includes(project.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedProjects(prev => [...prev, project.id]);
                              } else {
                                setSelectedProjects(prev => prev.filter(id => id !== project.id));
                              }
                            }}
                          />
                          <Label htmlFor={`approve-project-${project.id}`} className="cursor-pointer">
                            {project.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No projects available.</p>
                  )}
                </div>
              )}
              
              <DialogFooter>
                <Button variant="secondary" onClick={() => setIsApproveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => handleApproveUser(selectedUser.id)}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Approving...' : 'Approve User'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete User Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-dark-surface border border-dark-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
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