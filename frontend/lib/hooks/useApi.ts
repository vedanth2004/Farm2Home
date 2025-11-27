/* eslint-disable react-hooks/exhaustive-deps */
/**
 * Centralized API hooks for consistent data fetching and state management
 * Eliminates duplicate API logic and provides consistent error handling
 */

import { useState, useEffect, useCallback } from "react";
import { ApiResponse } from "@/lib/types";

// ============================================================================
// TYPES
// ============================================================================

export interface UseApiOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  retryCount?: number;
  retryDelay?: number;
}

export interface UseApiState<T = any> {
  data: T | null;
  loading: boolean;
  error: string | null;
  success: boolean;
}

export interface UseApiActions {
  execute: (...args: any[]) => Promise<void>;
  reset: () => void;
  setData: (data: any) => void;
  setError: (error: string) => void;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useApi<T = any>(
  apiFunction: (...args: any[]) => Promise<ApiResponse<T>>,
  options: UseApiOptions = {},
): UseApiState<T> & UseApiActions {
  const {
    immediate = false,
    onSuccess,
    onError,
    retryCount = 0,
    retryDelay = 1000,
  } = options;

  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
    success: false,
  });

  const execute = useCallback(
    async (...args: any[]) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      let attempts = 0;
      const maxAttempts = retryCount + 1;

      while (attempts < maxAttempts) {
        try {
          const response = await apiFunction(...args);

          if (response.success) {
            setState({
              data: response.data ?? null,
              loading: false,
              error: null,
              success: true,
            });
            onSuccess?.(response.data);
            return;
          } else {
            throw new Error(response.error || "API request failed");
          }
        } catch (error: any) {
          attempts++;

          if (attempts >= maxAttempts) {
            const errorMessage =
              error.message || "An unexpected error occurred";
            setState({
              data: null,
              loading: false,
              error: errorMessage,
              success: false,
            });
            onError?.(error);
            return;
          }

          // Wait before retry
          if (attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }
        }
      }
    },
    [apiFunction, onSuccess, onError, retryCount, retryDelay],
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      success: false,
    });
  }, []);

  const setData = useCallback((data: any) => {
    setState((prev) => ({ ...prev, data }));
  }, []);

  const setError = useCallback((error: string) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return {
    ...state,
    execute,
    reset,
    setData,
    setError,
  };
}

// ============================================================================
// SPECIALIZED HOOKS
// ============================================================================

/**
 * Hook for fetching data with automatic refresh
 */
export function useApiWithRefresh<T = any>(
  apiFunction: (...args: any[]) => Promise<ApiResponse<T>>,
  refreshInterval?: number,
  options: UseApiOptions = {},
) {
  const api = useApi(apiFunction, options);

  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(() => {
        api.execute();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, api.execute]);

  return api;
}

/**
 * Hook for paginated data
 */
export function usePaginatedApi<T = any>(
  apiFunction: (
    page: number,
    limit: number,
    ...args: any[]
  ) => Promise<ApiResponse<T[]>>,
  initialPage: number = 1,
  initialLimit: number = 10,
  options: UseApiOptions = {},
) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const api = useApi(apiFunction, {
    ...options,
    onSuccess: (data: any) => {
      if (data.pagination) {
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      }
      options.onSuccess?.(data);
    },
  });

  const fetchPage = useCallback(
    (newPage: number, newLimit?: number) => {
      const newLimitValue = newLimit || limit;
      setPage(newPage);
      if (newLimit) setLimit(newLimitValue);
      api.execute(newPage, newLimitValue);
    },
    [api.execute, limit],
  );

  const nextPage = useCallback(() => {
    if (page < totalPages) {
      fetchPage(page + 1);
    }
  }, [page, totalPages, fetchPage]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      fetchPage(page - 1);
    }
  }, [page, fetchPage]);

  const goToPage = useCallback(
    (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
        fetchPage(newPage);
      }
    },
    [totalPages, fetchPage],
  );

  return {
    ...api,
    page,
    limit,
    total,
    totalPages,
    fetchPage,
    nextPage,
    prevPage,
    goToPage,
    setLimit,
  };
}

/**
 * Hook for search functionality
 */
export function useSearchApi<T = any>(
  apiFunction: (query: string, ...args: any[]) => Promise<ApiResponse<T[]>>,
  debounceMs: number = 300,
  options: UseApiOptions = {},
) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const api = useApi(apiFunction, options);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Execute search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim()) {
      api.execute(debouncedQuery);
    }
  }, [debouncedQuery, api.execute]);

  const search = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    api.reset();
  }, [api.reset]);

  return {
    ...api,
    query,
    debouncedQuery,
    search,
    clearSearch,
  };
}

/**
 * Hook for form submission
 */
export function useFormApi<T = any>(
  apiFunction: (data: any) => Promise<ApiResponse<T>>,
  options: UseApiOptions = {},
) {
  const api = useApi(apiFunction, options);

  const submit = useCallback(
    async (data: any) => {
      await api.execute(data);
    },
    [api.execute],
  );

  return {
    ...api,
    submit,
  };
}

/**
 * Hook for CRUD operations
 */
export function useCrudApi<T = any>(
  apiFunctions: {
    create: (data: any) => Promise<ApiResponse<T>>;
    read: (id: string) => Promise<ApiResponse<T>>;
    update: (id: string, data: any) => Promise<ApiResponse<T>>;
    delete: (id: string) => Promise<ApiResponse<T>>;
    list: (...args: any[]) => Promise<ApiResponse<T[]>>;
  },
  options: UseApiOptions = {},
) {
  const createApi = useApi(apiFunctions.create, options);
  const readApi = useApi(apiFunctions.read, options);
  const updateApi = useApi(apiFunctions.update, options);
  const deleteApi = useApi(apiFunctions.delete, options);
  const listApi = useApi(apiFunctions.list, options);

  const create = useCallback(
    async (data: any) => {
      await createApi.execute(data);
    },
    [createApi.execute],
  );

  const read = useCallback(
    async (id: string) => {
      await readApi.execute(id);
    },
    [readApi.execute],
  );

  const update = useCallback(
    async (id: string, data: any) => {
      await updateApi.execute(id, data);
    },
    [updateApi.execute],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      await deleteApi.execute(id);
    },
    [deleteApi.execute],
  );

  const list = useCallback(
    async (...args: any[]) => {
      await listApi.execute(...args);
    },
    [listApi.execute],
  );

  return {
    create: {
      ...createApi,
      execute: create,
    },
    read: {
      ...readApi,
      execute: read,
    },
    update: {
      ...updateApi,
      execute: update,
    },
    delete: {
      ...deleteApi,
      execute: deleteItem,
    },
    list: {
      ...listApi,
      execute: list,
    },
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook for optimistic updates
 */
export function useOptimisticApi<T = any>(
  apiFunction: (data: any) => Promise<ApiResponse<T>>,
  options: UseApiOptions = {},
) {
  const api = useApi(apiFunction, options);

  const optimisticUpdate = useCallback(
    async (data: any, optimisticData: T) => {
      // Set optimistic data immediately
      api.setData(optimisticData);

      try {
        await api.execute(data);
      } catch (error) {
        // Revert on error
        api.reset();
        throw error;
      }
    },
    [api],
  );

  return {
    ...api,
    optimisticUpdate,
  };
}

/**
 * Hook for batch operations
 */
export function useBatchApi<T = any>(
  apiFunction: (items: any[]) => Promise<ApiResponse<T[]>>,
  options: UseApiOptions = {},
) {
  const api = useApi(apiFunction, options);

  const batchExecute = useCallback(
    async (items: any[]) => {
      await api.execute(items);
    },
    [api.execute],
  );

  return {
    ...api,
    batchExecute,
  };
}
