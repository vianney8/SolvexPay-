import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";
import { apiRequest } from "@/lib/queryClient";

type SafeUser = Omit<User, "passwordHash">;

async function fetchUser(): Promise<SafeUser | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (response.status === 403) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

function clearOtherQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== "/api/auth/user",
  });
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading, error } = useQuery<SafeUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const isBlocked = !!(user?.isBlocked);

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/user"], data);
      clearOtherQueries(queryClient);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { fullName: string; email: string; phone: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return res.json();
    },
    onSuccess: (data) => {
      if (!data.requiresVerification) {
        queryClient.setQueryData(["/api/auth/user"], data);
        clearOtherQueries(queryClient);
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      clearOtherQueries(queryClient);
    },
  });

  return {
    user,
    isLoading,
    isBlocked,
    isAuthenticated: !!user,
    login: loginMutation,
    register: registerMutation,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
