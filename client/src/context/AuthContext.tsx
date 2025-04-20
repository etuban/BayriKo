import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { User } from '../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  
  // Check if user is authenticated
  const { isLoading } = useQuery({
    queryKey: ['/api/auth/session'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        
        if (data.authenticated) {
          setUser(data.user);
          setIsAuthenticated(true);
          
          // If at login page, redirect to dashboard
          if (window.location.pathname === '/login') {
            navigate('/dashboard');
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
        
        return data;
      } catch (error) {
        setUser(null);
        setIsAuthenticated(false);
        throw error;
      }
    }
  });
  
  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await apiRequest('POST', '/api/auth/login', { email, password });
      return res.json();
    },
    onSuccess: (data) => {
      setUser(data.user);
      setIsAuthenticated(true);
      toast({
        title: "Success",
        description: "You've been logged in successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/session'] });
      
      // Force reload to refresh the page and navigate to dashboard
      window.location.href = '/dashboard';
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    }
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/auth/logout', {});
      return res.json();
    },
    onSuccess: () => {
      setUser(null);
      setIsAuthenticated(false);
      toast({
        title: "Success",
        description: "You've been logged out successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/session'] });
      navigate('/login');
    },
    onError: (error: any) => {
      toast({
        title: "Logout failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (userData: Partial<User>) => {
      if (!user) throw new Error("Not authenticated");
      const res = await apiRequest('PUT', `/api/users/${user.id}`, userData);
      return res.json();
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      toast({
        title: "Success",
        description: "Your profile has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/session'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  });

  // Login function
  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  // Logout function
  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  // Update profile function
  const updateProfile = async (userData: Partial<User>) => {
    await updateProfileMutation.mutateAsync(userData);
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    updateProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
