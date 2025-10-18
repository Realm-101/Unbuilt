import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false, // Don't refetch on every mount
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}