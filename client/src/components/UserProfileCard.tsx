import React from 'react';
import { User } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

interface UserProfileCardProps {
  user: User | null;
}

export function UserProfileCard({ user }: UserProfileCardProps) {
  if (!user) return null;

  return (
    <div className="border-t border-dark-border mt-4 p-4">
      <div className="flex items-center">
        <Avatar>
          <AvatarImage src={user.avatarUrl} alt={user.fullName} />
          <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
        </Avatar>
        <div className="ml-3">
          <p className="font-medium">{user.fullName}</p>
          <p className="text-xs text-gray-400">{user.email}</p>
          <p className="text-xs mt-1 text-primary capitalize">{user.role}</p>
        </div>
      </div>
    </div>
  );
}
