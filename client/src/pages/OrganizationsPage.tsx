import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, Plus, Pencil, Trash2, Building2, Users, Briefcase, Link2, Copy, Mail, Calendar, Share2 } from 'lucide-react';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Define the Organization interface
interface Organization {
  id: number;
  name: string;
  description?: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  createdAt: string;
  updatedAt: string;
  userCount?: number;
  projectCount?: number;
}

// Define the InvitationLink interface
interface InvitationLink {
  id: number;
  organizationId: number;
  createdById: number;
  token: string;
  role: 'super_admin' | 'supervisor' | 'team_lead' | 'staff';
  message: string;
  expires: string | null;
  maxUses: number | null;
  usedCount: number;
  createdAt: string;
  active: boolean;
  organization?: {
    name: string;
  };
  createdBy?: {
    name: string;
    email: string;
  };
}

// Define the form schema
const organizationFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Must be a valid email").optional(),
  website: z.string().url("Must be a valid URL").optional().or(z.literal(''))
});

// Invitation form schema
const invitationFormSchema = z.object({
  role: z.enum(['super_admin', 'supervisor', 'team_lead', 'staff']),
  message: z.string().min(1, "Message is required"),
  expires: z.string().optional(),
  maxUses: z.number().min(1, "Must be at least 1").optional(),
});

type OrganizationFormValues = z.infer<typeof organizationFormSchema>;
type InvitationFormValues = z.infer<typeof invitationFormSchema>;

export default function OrganizationsPage() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [invitations, setInvitations] = useState<InvitationLink[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const linkRef = useRef<HTMLInputElement>(null);

  // Fetch organizations
  const { data: organizations, isLoading } = useQuery<Organization[]>({
    queryKey: ['/api/organizations'],
    refetchOnWindowFocus: false,
  });

  // Create form
  const createForm = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: '',
      description: '',
      logoUrl: '',
      address: '',
      phone: '',
      email: '',
      website: '',
    },
  });

  // Edit form
  const editForm = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: '',
      description: '',
      logoUrl: '',
      address: '',
      phone: '',
      email: '',
      website: '',
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (orgData: OrganizationFormValues) => {
      const res = await apiRequest("POST", "/api/organizations", orgData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      setCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Organization created",
        description: "The organization has been successfully created.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create organization: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (orgData: OrganizationFormValues & { id: number }) => {
      const { id, ...data } = orgData;
      const res = await apiRequest("PUT", `/api/organizations/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      setEditDialogOpen(false);
      editForm.reset();
      toast({
        title: "Organization updated",
        description: "The organization has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update organization: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/organizations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      setDeleteDialogOpen(false);
      toast({
        title: "Organization deleted",
        description: "The organization has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete organization: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form submissions
  const handleCreateOrganization = (data: OrganizationFormValues) => {
    createMutation.mutate(data);
  };

  const handleUpdateOrganization = (data: OrganizationFormValues) => {
    if (selectedOrganization) {
      updateMutation.mutate({ ...data, id: selectedOrganization.id });
    }
  };

  const handleDeleteOrganization = () => {
    if (selectedOrganization) {
      deleteMutation.mutate(selectedOrganization.id);
    }
  };

  // Open edit dialog with organization data
  const openEditDialog = (organization: Organization) => {
    setSelectedOrganization(organization);
    editForm.reset({
      name: organization.name,
      description: organization.description || '',
      logoUrl: organization.logoUrl || '',
      address: organization.address || '',
      phone: organization.phone || '',
      email: organization.email || '',
      website: organization.website || '',
    });
    setEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (organization: Organization) => {
    setSelectedOrganization(organization);
    setDeleteDialogOpen(true);
  };
  
  // Invitation form
  const invitationForm = useForm<InvitationFormValues>({
    resolver: zodResolver(invitationFormSchema),
    defaultValues: {
      role: 'staff',
      message: "You've been invited to join our organization.",
      expires: '',
      maxUses: undefined,
    },
  });
  
  // Create invitation mutation
  const createInvitationMutation = useMutation({
    mutationFn: async (data: InvitationFormValues & { organizationId: number }) => {
      const res = await apiRequest("POST", "/api/invitations", data);
      return await res.json();
    },
    onSuccess: (data) => {
      if (selectedOrganization) {
        fetchInvitations(selectedOrganization.id);
      }
      invitationForm.reset();
      toast({
        title: "Invitation created",
        description: "The invitation link has been successfully created.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create invitation: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Delete invitation mutation
  const deleteInvitationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/invitations/${id}`);
    },
    onSuccess: () => {
      if (selectedOrganization) {
        fetchInvitations(selectedOrganization.id);
      }
      toast({
        title: "Invitation deleted",
        description: "The invitation link has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete invitation: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const handleCreateInvitation = (data: InvitationFormValues) => {
    if (selectedOrganization) {
      createInvitationMutation.mutate({
        ...data,
        organizationId: selectedOrganization.id,
      });
    }
  };
  
  const fetchInvitations = async (organizationId: number) => {
    try {
      setLoadingInvitations(true);
      const res = await apiRequest("GET", `/api/organizations/${organizationId}/invitations`);
      const data = await res.json();
      setInvitations(data);
    } catch (error) {
      console.error("Failed to fetch invitations:", error);
      toast({
        title: "Error",
        description: "Failed to fetch invitations.",
        variant: "destructive",
      });
    } finally {
      setLoadingInvitations(false);
    }
  };
  
  const openInviteDialog = (organization: Organization) => {
    setSelectedOrganization(organization);
    setInviteDialogOpen(true);
    fetchInvitations(organization.id);
  };
  
  const copyInvitationLink = (token: string) => {
    const link = `${window.location.origin}/auth?invitation=${token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copied",
      description: "Invitation link copied to clipboard.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container p-4 mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Organizations</h1>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Organization
        </Button>
      </div>

      {organizations && organizations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map((org) => (
            <Card key={org.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{org.name}</CardTitle>
                    {org.website && (
                      <CardDescription>
                        <a 
                          href={org.website.startsWith('http') ? org.website : `https://${org.website}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          {org.website}
                        </a>
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" onClick={() => openInviteDialog(org)}>
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Manage Invitations</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" onClick={() => openEditDialog(org)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit Organization</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" onClick={() => openDeleteDialog(org)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete Organization</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                {org.description && <p className="text-sm text-muted-foreground mb-4">{org.description}</p>}
                
                <div className="flex flex-col space-y-2 text-sm">
                  {org.address && (
                    <div className="flex items-center">
                      <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{org.address}</span>
                    </div>
                  )}
                  {org.phone && (
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>{org.phone}</span>
                    </div>
                  )}
                  {org.email && (
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>{org.email}</span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <div className="flex items-center space-x-4 w-full">
                  <Badge variant="outline" className="flex items-center">
                    <Users className="h-3 w-3 mr-1" />
                    {org.userCount ?? 0} {org.userCount === 1 ? 'User' : 'Users'}
                  </Badge>
                  <Badge variant="outline" className="flex items-center">
                    <Briefcase className="h-3 w-3 mr-1" />
                    {org.projectCount ?? 0} {org.projectCount === 1 ? 'Project' : 'Projects'}
                  </Badge>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Alert>
          <AlertTitle>No organizations found</AlertTitle>
          <AlertDescription>
            You haven&apos;t created any organizations yet. 
            Click the &quot;Add Organization&quot; button to create your first one.
          </AlertDescription>
        </Alert>
      )}

      {/* Create Organization Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
            <DialogDescription>
              Create a new organization to manage projects and users.
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateOrganization)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter organization name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Brief description of your organization" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Organization address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Contact phone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Contact email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={createForm.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter the full URL including http:// or https://
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Organization Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>
              Update the organization details.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdateOrganization)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter organization name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Brief description of your organization" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Organization address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Contact phone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Contact email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter the full URL including http:// or https://
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Update
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the organization
              {selectedOrganization?.name && ` "${selectedOrganization.name}"`}.
              <br /><br />
              <strong>Note:</strong> You can only delete organizations with no users or projects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrganization} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invitation Links Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Invitation Links</DialogTitle>
            <DialogDescription>
              {selectedOrganization && (
                <>Manage invitation links for <strong>{selectedOrganization.name}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="active">
            <TabsList className="mb-4">
              <TabsTrigger value="active">Active Invitations</TabsTrigger>
              <TabsTrigger value="create">Create New Invitation</TabsTrigger>
            </TabsList>
            
            <TabsContent value="active">
              {loadingInvitations ? (
                <div className="flex justify-center p-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : invitations.length > 0 ? (
                <div className="space-y-4">
                  {invitations
                    .filter(inv => inv.active)
                    .map(invitation => (
                      <Card key={invitation.id} className="relative overflow-hidden">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg flex items-center">
                                <Badge className="mr-2">{invitation.role}</Badge>
                                <span>Invitation Link</span>
                              </CardTitle>
                              <CardDescription>
                                Created on {new Date(invitation.createdAt).toLocaleDateString()}
                              </CardDescription>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteInvitationMutation.mutate(invitation.id)}
                              className="text-red-500"
                              disabled={deleteInvitationMutation.isPending}
                            >
                              {deleteInvitationMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pb-2">
                          <div className="flex flex-col space-y-3">
                            <div className="flex space-x-2 items-center">
                              <Input 
                                readOnly 
                                value={`${window.location.origin}/auth?invitation=${invitation.token}`}
                                ref={linkRef}
                                className="font-mono text-xs"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => copyInvitationLink(invitation.token)}
                                className="flex-shrink-0"
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
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              ) : (
                <Alert className="my-4">
                  <AlertTitle>No active invitations</AlertTitle>
                  <AlertDescription>
                    You haven't created any invitation links for this organization yet.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
            
            <TabsContent value="create">
              <Form {...invitationForm}>
                <form onSubmit={invitationForm.handleSubmit(handleCreateInvitation)} className="space-y-4">
                  <FormField
                    control={invitationForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User Role</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="team_lead">Team Lead</SelectItem>
                            <SelectItem value="supervisor">Supervisor</SelectItem>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The role determines what permissions the user will have in the organization
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={invitationForm.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invitation Message</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter the message you want to send with the invitation"
                            className="min-h-[100px]"
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
                              min={new Date().toISOString().split('T')[0]}
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
                              onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
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
                  
                  <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => setInviteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createInvitationMutation.isPending}>
                      {createInvitationMutation.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Create Invitation
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}