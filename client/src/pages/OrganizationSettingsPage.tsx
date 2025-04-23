import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Building, Image, Save } from 'lucide-react';
import { Organization } from '@shared/schema';

// Form schema with validation
const organizationFormSchema = z.object({
  name: z.string().min(3, 'Organization name must be at least 3 characters'),
  logoUrl: z.string().url('Please enter a valid URL').or(z.string().length(0))
});

type OrganizationFormValues = z.infer<typeof organizationFormSchema>;

export default function OrganizationSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [previewLogoUrl, setPreviewLogoUrl] = useState<string>('');

  // Fetch current organization
  const { data: organization, isLoading } = useQuery<Organization>({
    queryKey: ['/api/organizations/current'],
    enabled: !!user?.currentOrganizationId
  });

  // Form setup
  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: '',
      logoUrl: ''
    }
  });

  // Update form when organization data is loaded
  React.useEffect(() => {
    if (organization) {
      form.reset({
        name: organization.name || '',
        logoUrl: organization.logoUrl || ''
      });
      
      // Set preview URL
      if (organization.logoUrl) {
        setPreviewLogoUrl(organization.logoUrl);
      }
    }
  }, [organization, form]);

  // Update organization mutation
  const updateOrganizationMutation = useMutation({
    mutationFn: async (data: OrganizationFormValues) => {
      if (!user?.currentOrganizationId) {
        throw new Error('No organization selected');
      }
      const response = await apiRequest('PATCH', `/api/organizations/${user.currentOrganizationId}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Organization updated',
        description: 'Your organization details have been updated successfully.',
      });
      // Invalidate queries that might contain the organization data
      queryClient.invalidateQueries({ queryKey: ['/api/organizations/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/organizations/current'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating organization',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Handle form submission
  const onSubmit = (data: OrganizationFormValues) => {
    updateOrganizationMutation.mutate(data);
  };

  // Update preview when logo URL changes
  const handleLogoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    form.setValue('logoUrl', url);
    setPreviewLogoUrl(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-40" />
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-24" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Organization Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>
            Update your organization information. This will be displayed on invoices and other documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <div className="flex">
                        <div className="bg-primary rounded-l-md p-2 flex items-center">
                          <Building className="h-5 w-5 text-white" />
                        </div>
                        <Input
                          {...field}
                          placeholder="Your organization name"
                          className="rounded-l-none"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL</FormLabel>
                    <FormControl>
                      <div className="flex">
                        <div className="bg-primary rounded-l-md p-2 flex items-center">
                          <Image className="h-5 w-5 text-white" />
                        </div>
                        <Input
                          {...field}
                          placeholder="https://example.com/logo.png"
                          className="rounded-l-none"
                          onChange={handleLogoUrlChange}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Logo Preview */}
              {previewLogoUrl && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium mb-2">Logo Preview:</h3>
                  <div className="border border-border rounded-md p-4 flex items-center justify-center bg-card">
                    <img
                      src={previewLogoUrl}
                      alt="Organization logo preview"
                      className="max-h-32 max-w-full"
                      onError={() => {
                        toast({
                          title: "Logo preview failed",
                          description: "The image URL could not be loaded. Please check the URL.",
                          variant: "destructive",
                        });
                        setPreviewLogoUrl('');
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    This is how your logo will appear on invoices.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-white"
                disabled={updateOrganizationMutation.isPending}
              >
                {updateOrganizationMutation.isPending ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}