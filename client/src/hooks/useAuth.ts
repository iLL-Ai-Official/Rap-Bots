import { useQuery } from "@tanstack/react-query";

export interface User {
  id: string;
  username?: string;
  email?: string;
  // add more fields as your auth payload requires
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}