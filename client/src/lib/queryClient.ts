import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Token storage with localStorage persistence
const ACCESS_TOKEN_KEY = 'access_token';

let accessToken: string | null = null;

// Initialize from localStorage on module load
if (typeof window !== 'undefined') {
  accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: HeadersInit = {};
  
  // Add Authorization header if we have an access token
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const requestOptions: RequestInit = {
    method,
    credentials: "include", // Still send cookies for refresh token
    headers,
  };

  // Only add body and content-type for non-GET/HEAD requests
  if (method !== "GET" && method !== "HEAD" && data) {
    requestOptions.headers = { 
      ...headers,
      "Content-Type": "application/json" 
    };
    requestOptions.body = JSON.stringify(data);
  }

  const res = await fetch(url, requestOptions);
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: HeadersInit = {};
    
    // Add Authorization header if we have an access token
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes instead of Infinity
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
