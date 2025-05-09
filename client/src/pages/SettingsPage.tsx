import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/hooks/useTheme';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, currencyOptions, getUserCurrency, setUserCurrency } from '@/lib/utils';
import { User, Moon, Sun, Key, UserSquare, Shield, DollarSign, MessageSquare, Send } from 'lucide-react';

// Form validation schema
const profileFormSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  position: z.string().optional(),
  avatarUrl: z.string().url('Invalid URL').optional().or(z.literal(''))
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password confirmation is required')
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const feedbackFormSchema = z.object({
  feedback: z.string().min(5, 'Feedback must be at least 5 characters').max(2000, 'Feedback must be less than 2000 characters'),
  featureRequests: z.string().optional(),
  improvements: z.string().optional(),
});

// CurrencySelector component
function CurrencySelector() {
  const [selectedCurrency, setSelectedCurrency] = useState(getUserCurrency());
  const { toast } = useToast();
  
  // Handle currency change
  const handleCurrencyChange = (value: string) => {
    setSelectedCurrency(value);
    setUserCurrency(value);
    toast({
      title: "Currency changed",
      description: `Your currency has been changed to ${value}`,
    });
  };
  
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label htmlFor="currency-selector">Currency</Label>
        <p className="text-sm text-gray-400">
          Select your preferred currency for the application
        </p>
      </div>
      <Select value={selectedCurrency} onValueChange={handleCurrencyChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select Currency" />
        </SelectTrigger>
        <SelectContent>
          {currencyOptions.map((currency) => (
            <SelectItem key={currency.value} value={currency.value}>
              <span className="flex items-center">
                <span className="mr-2">{currency.symbol}</span>
                {currency.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  
  // Profile form setup
  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      email: user?.email || '',
      username: user?.username || '',
      position: user?.position || '',
      avatarUrl: user?.avatarUrl || ''
    }
  });
  
  // Password form setup
  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  });

  // Feedback form setup
  const feedbackForm = useForm<z.infer<typeof feedbackFormSchema>>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      feedback: '',
      featureRequests: '',
      improvements: ''
    }
  });
  
  // Update profile
  const handleProfileUpdate = async (data: z.infer<typeof profileFormSchema>) => {
    try {
      await updateProfile(data);
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.'
      });
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update profile',
        variant: 'destructive'
      });
    }
  };
  
  // Update password
  const handlePasswordUpdate = async (data: z.infer<typeof passwordFormSchema>) => {
    try {
      await updateProfile({ password: data.newPassword } as any);
      toast({
        title: 'Password updated',
        description: 'Your password has been updated successfully.'
      });
      passwordForm.reset();
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update password',
        variant: 'destructive'
      });
    }
  };
  
  // Submit feedback
  const handleFeedbackSubmit = async (data: z.infer<typeof feedbackFormSchema>) => {
    try {
      setFeedbackSubmitting(true);
      
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          // Include user details for the email
          userEmail: user?.email,
          userName: user?.fullName,
          userRole: user?.role,
          organizationId: user?.organizations?.[0]?.id || user?.currentOrganizationId,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit feedback');
      }
      
      toast({
        title: 'Feedback submitted',
        description: 'Thank you for your feedback! We appreciate your input.',
      });
      
      // Reset the form
      feedbackForm.reset();
      
    } catch (error: any) {
      toast({
        title: 'Submission failed',
        description: error.message || 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setFeedbackSubmitting(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>
      
      <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 md:w-[500px]">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <UserSquare className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            Appearance
          </TabsTrigger>
          <TabsTrigger value="feedback" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Feedback
          </TabsTrigger>
        </TabsList>
        
        {/* Profile Settings */}
        <TabsContent value="profile">
          <Card className="bg-dark-surface border border-dark-border">
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Update your personal information and how others see you on the platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Overview */}
              <div className="flex items-start space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user?.avatarUrl} alt={user?.fullName} />
                  <AvatarFallback className="text-lg">{getInitials(user?.fullName || '')}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-medium">{user?.fullName}</h3>
                  <p className="text-sm text-gray-400">{user?.email}</p>
                  <p className="text-sm mt-1 capitalize">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary">
                      <Shield className="h-3 w-3 mr-1" />
                      {user?.role}
                    </span>
                  </p>
                </div>
              </div>
              
              {/* Profile Form */}
              <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input 
                      id="fullName" 
                      {...profileForm.register('fullName')}
                      className="bg-dark-bg"
                    />
                    {profileForm.formState.errors.fullName && (
                      <p className="text-red-500 text-xs">{profileForm.formState.errors.fullName.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input 
                      id="username" 
                      {...profileForm.register('username')}
                      className="bg-dark-bg"
                    />
                    {profileForm.formState.errors.username && (
                      <p className="text-red-500 text-xs">{profileForm.formState.errors.username.message}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email"
                    {...profileForm.register('email')}
                    className="bg-dark-bg"
                  />
                  {profileForm.formState.errors.email && (
                    <p className="text-red-500 text-xs">{profileForm.formState.errors.email.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input 
                    id="position" 
                    {...profileForm.register('position')}
                    className="bg-dark-bg"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="avatarUrl">Avatar URL</Label>
                  <Input 
                    id="avatarUrl" 
                    {...profileForm.register('avatarUrl')}
                    className="bg-dark-bg"
                  />
                  {profileForm.formState.errors.avatarUrl && (
                    <p className="text-red-500 text-xs">{profileForm.formState.errors.avatarUrl.message}</p>
                  )}
                </div>
                
                <Button 
                  type="submit" 
                  className="bg-primary hover:bg-primary/90 mt-4"
                  disabled={profileForm.formState.isSubmitting}
                >
                  {profileForm.formState.isSubmitting ? 'Saving...' : 'Save Profile'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Security Settings */}
        <TabsContent value="security">
          <Card className="bg-dark-surface border border-dark-border">
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>
                Manage your password and account security.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={passwordForm.handleSubmit(handlePasswordUpdate)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input 
                    id="currentPassword" 
                    type="password"
                    {...passwordForm.register('currentPassword')}
                    className="bg-dark-bg"
                  />
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-red-500 text-xs">{passwordForm.formState.errors.currentPassword.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input 
                    id="newPassword" 
                    type="password"
                    {...passwordForm.register('newPassword')}
                    className="bg-dark-bg"
                  />
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-red-500 text-xs">{passwordForm.formState.errors.newPassword.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password"
                    {...passwordForm.register('confirmPassword')}
                    className="bg-dark-bg"
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-red-500 text-xs">{passwordForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
                
                <Button 
                  type="submit" 
                  className="bg-primary hover:bg-primary/90 mt-4"
                  disabled={passwordForm.formState.isSubmitting}
                >
                  {passwordForm.formState.isSubmitting ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Appearance Settings */}
        <TabsContent value="appearance">
          <Card className="bg-dark-surface border border-dark-border">
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the look and feel of the application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="theme-toggle">Dark Mode</Label>
                  <p className="text-sm text-gray-400">
                    Switch between light and dark themes
                  </p>
                </div>
                <Switch 
                  id="theme-toggle" 
                  checked={theme === 'dark'}
                  onCheckedChange={toggleTheme}
                />
              </div>
              
              <div className="border-t border-dark-border pt-6">
                <CurrencySelector />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feedback Form */}
        <TabsContent value="feedback">
          <Card className="bg-dark-surface border border-dark-border">
            <CardHeader>
              <CardTitle>Feedback</CardTitle>
              <CardDescription>
                We value your feedback! Help us improve BayriKo by sharing your thoughts and suggestions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={feedbackForm.handleSubmit(handleFeedbackSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="feedback">General Feedback</Label>
                  <textarea 
                    id="feedback"
                    {...feedbackForm.register('feedback')}
                    className="w-full h-32 rounded-md border border-input bg-dark-bg px-3 py-2 text-sm ring-offset-background 
                    placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 
                    focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Share your overall experience with the application..."
                  ></textarea>
                  {feedbackForm.formState.errors.feedback && (
                    <p className="text-red-500 text-xs">{feedbackForm.formState.errors.feedback.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="featureRequests">Feature Requests</Label>
                  <textarea 
                    id="featureRequests"
                    {...feedbackForm.register('featureRequests')}
                    className="w-full h-24 rounded-md border border-input bg-dark-bg px-3 py-2 text-sm ring-offset-background 
                    placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 
                    focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="What new features would you like to see?"
                  ></textarea>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="improvements">Areas for Improvement</Label>
                  <textarea 
                    id="improvements"
                    {...feedbackForm.register('improvements')}
                    className="w-full h-24 rounded-md border border-input bg-dark-bg px-3 py-2 text-sm ring-offset-background 
                    placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 
                    focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="What aspects of the application could be improved?"
                  ></textarea>
                </div>
                
                <div className="pt-4">
                  <Button 
                    type="submit" 
                    className="bg-primary hover:bg-primary/90 w-full md:w-auto flex items-center gap-2"
                    disabled={feedbackSubmitting}
                  >
                    {feedbackSubmitting ? (
                      <>Submitting Feedback...</>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Submit Feedback
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col items-start">
              <p className="text-sm text-muted-foreground">
                Your feedback will be sent to our development team at pawnmedia.ph@gmail.com
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
