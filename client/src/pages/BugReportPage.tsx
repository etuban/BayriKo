import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Bug, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

// Define the schema for the bug report form
const bugReportFormSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters' }).max(100),
  description: z.string().min(10, { message: 'Description must be at least 10 characters' }),
  stepsToReproduce: z.string().optional(),
  browserInfo: z.string().optional(),
});

type BugReportFormValues = z.infer<typeof bugReportFormSchema>;

export default function BugReportPage() {
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Define form with validation
  const form = useForm<BugReportFormValues>({
    resolver: zodResolver(bugReportFormSchema),
    defaultValues: {
      title: '',
      description: '',
      stepsToReproduce: '',
      browserInfo: '',
    },
  });

  // Mutation for submitting bug report
  const submitBugMutation = useMutation({
    mutationFn: async (formData: BugReportFormValues) => {
      const response = await apiRequest('POST', '/api/bug-report', formData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Bug report submitted',
        description: 'Thank you for your feedback! We will look into this issue.',
        variant: 'default',
      });
      setIsSubmitted(true);
    },
    onError: (error: any) => {
      toast({
        title: 'Error submitting bug report',
        description: error.message || 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: BugReportFormValues) => {
    // Auto-detect browser info if not provided
    if (!data.browserInfo) {
      data.browserInfo = navigator.userAgent;
    }
    submitBugMutation.mutate(data);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <Link to="/">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </Link>

      <Card className="bg-dark-surface border border-dark-border">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 mb-2">
            <Bug className="h-6 w-6 text-red-500" />
            <CardTitle className="text-2xl">Report a Bug</CardTitle>
          </div>
          <CardDescription>
            Found an issue? Let us know so we can fix it as quickly as possible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSubmitted ? (
            <div className="text-center py-8">
              <div className="bg-green-500/10 text-green-500 p-4 rounded-lg inline-flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">Bug Report Submitted</h3>
              <p className="text-gray-400 mb-6">Thank you for helping us improve the application!</p>
              <Link to="/">
                <Button>Return to Dashboard</Button>
              </Link>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., 'Cannot save task changes'" 
                          {...field} 
                          className="bg-dark-bg"
                        />
                      </FormControl>
                      <FormDescription>
                        A brief title that describes the issue
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe what went wrong in detail..." 
                          {...field} 
                          className="bg-dark-bg min-h-[120px]"
                        />
                      </FormControl>
                      <FormDescription>
                        Detailed explanation of the issue you're experiencing
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stepsToReproduce"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Steps to Reproduce <span className="text-gray-400 text-sm">(Optional)</span></FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="1. Go to Tasks page
2. Click on 'New Task'
3. Fill in details and submit
4. Error appears..." 
                          {...field} 
                          className="bg-dark-bg min-h-[120px]"
                        />
                      </FormControl>
                      <FormDescription>
                        Step-by-step instructions to reproduce the issue
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="browserInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Browser & Device Info <span className="text-gray-400 text-sm">(Optional)</span></FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Chrome 95, Windows 10" 
                          {...field} 
                          className="bg-dark-bg"
                        />
                      </FormControl>
                      <FormDescription>
                        Browser and device information (will be auto-detected if left blank)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-4">
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={submitBugMutation.isPending}
                  >
                    {submitBugMutation.isPending ? 'Submitting...' : 'Submit Bug Report'}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}