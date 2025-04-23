import React, { useEffect, useState } from "react";
import { User, Organization } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Building } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface UserProfileCardProps {
  user: User | null;
}

export function UserProfileCard({ user }: UserProfileCardProps) {
  if (!user) return null;

  // Fetch user's organizations
  const { data: userOrganizations } = useQuery<Organization[]>({
    queryKey: ["/api/users", user.id, "organizations"],
    queryFn: async () => {
      const response = await fetch(`/api/users/${user.id}/organizations`);
      if (!response.ok) throw new Error("Failed to fetch user organizations");
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Get primary organization (first one or null)
  const primaryOrganization =
    userOrganizations && userOrganizations.length > 0
      ? userOrganizations[0]
      : null;

  return (
    <div className="border-t border-dark-border mt-4 p-4">
      <div className="flex items-center">
        <Avatar>
          <AvatarImage src={user.avatarUrl} alt={user.fullName} />
          <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
        </Avatar>
        <div className="ml-3 flex-1">
          <p className="font-medium">{user.fullName}</p>
          <p className="text-xs text-gray-400">{user.email}</p>
          <span className="mt-2 text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary capitalize">
            {user.role}
          </span>
        </div>
      </div>
      <div className="items-center gap-2 mt-1.5">
        {primaryOrganization && (
          <Badge
            variant="outline"
            className="text-xs flex items-center gap-1 px-2 py-0.5"
          >
            <Building className="h-3 w-3" />
            {primaryOrganization.name}
          </Badge>
        )}
      </div>
    </div>
  );
}
