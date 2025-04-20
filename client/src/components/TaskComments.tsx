import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TaskComment } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Paperclip, Bold, Italic, List, Image } from 'lucide-react';
import { timeAgo, getInitials } from '@/lib/utils';
import { RichTextEditor } from './RichTextEditor';

interface TaskCommentsProps {
  taskId: number;
  readonly?: boolean;
}

export function TaskComments({ taskId, readonly = false }: TaskCommentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  
  // Fetch task comments
  const { data: comments = [], isLoading } = useQuery<TaskComment[]>({
    queryKey: [`/api/tasks/${taskId}/comments`],
    enabled: !!taskId,
  });
  
  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (commentData: { content: string, attachments?: string[] }) => {
      const res = await apiRequest('POST', `/api/tasks/${taskId}/comments`, commentData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/comments`] });
      toast({
        title: 'Comment added',
        description: 'Your comment has been added successfully'
      });
      setContent('');
      setAttachments([]);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add comment',
        variant: 'destructive'
      });
    }
  });
  
  // Handle comment submission
  const handleSubmitComment = () => {
    if (!content.trim()) return;
    
    addCommentMutation.mutate({
      content,
      attachments
    });
  };

  return (
    <div className="mt-8">
      <h3 className="text-lg font-medium mb-3">Comments</h3>
      
      {/* Comment List */}
      <div className="space-y-4 mb-4">
        {isLoading ? (
          <div className="text-center py-4">
            <span className="text-gray-400">Loading comments...</span>
          </div>
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="border border-dark-border rounded-md p-3">
              <div className="flex items-start">
                <Avatar className="h-8 w-8 mr-3">
                  <AvatarImage src={comment.user?.avatarUrl} alt={comment.user?.fullName} />
                  <AvatarFallback>{getInitials(comment.user?.fullName || '')}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">{comment.user?.fullName}</h4>
                    <span className="text-xs text-gray-400">{timeAgo(comment.createdAt)}</span>
                  </div>
                  <div className="mt-1 text-sm" dangerouslySetInnerHTML={{ __html: comment.content }} />
                  
                  {/* Comment Attachments */}
                  {comment.attachments && comment.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {comment.attachments.map((attachment, index) => (
                        <a 
                          key={index} 
                          href={attachment} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-dark-bg rounded-md p-2 flex items-center text-xs text-primary hover:underline"
                        >
                          <Paperclip className="w-4 h-4 mr-1" />
                          <span>Attachment {index + 1}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 border border-dark-border rounded-md">
            <span className="text-gray-400">No comments yet</span>
          </div>
        )}
      </div>
      
      {/* New Comment Form - hide in readonly mode */}
      {!readonly && (
        <div className="border border-dark-border rounded-md p-3">
          <h4 className="text-sm font-medium mb-2">Add Comment</h4>
          <div className="space-y-3">
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Type your comment..."
            />
            
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" className="text-gray-400">
                <Paperclip className="w-4 h-4 mr-1" />
                <span className="text-xs">Attach File</span>
              </Button>
              
              <Button 
                variant="default"
                size="sm"
                className="bg-primary hover:bg-primary/90"
                onClick={handleSubmitComment}
                disabled={!content.trim() || addCommentMutation.isPending}
              >
                {addCommentMutation.isPending ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
