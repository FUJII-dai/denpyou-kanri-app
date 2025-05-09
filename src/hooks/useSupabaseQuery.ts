import { useState, useEffect, useCallback } from 'react';
import { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface QueryOptions<T> {
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: PostgrestError | Error) => void;
  select?: string;
  filter?: Record<string, any>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
}

interface QueryResult<T> {
  data: T | null;
  error: PostgrestError | Error | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<void>;
}

/**
 * A hook for querying Supabase data with React Query-like API
 */
export function useSupabaseQuery<T>(
  tableName: string,
  options: QueryOptions<T> = {}
): QueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<PostgrestError | Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    if (options.enabled === false) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase.from(tableName).select(options.select || '*');

      if (options.filter) {
        Object.entries(options.filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      if (options.order) {
        query = query.order(options.order.column, {
          ascending: options.order.ascending,
        });
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data: result, error: queryError } = await query;

      if (queryError) {
        setError(queryError);
        setData(null);
        if (options.onError) options.onError(queryError);
      } else {
        setData(result as T);
        setError(null);
        if (options.onSuccess) options.onSuccess(result as T);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setData(null);
      if (options.onError) options.onError(error);
    } finally {
      setIsLoading(false);
    }
  }, [tableName, options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    error,
    isLoading,
    isError: error !== null,
    refetch: fetchData,
  };
}
