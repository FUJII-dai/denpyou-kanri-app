import { supabase } from '../lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';

/**
 * Generic API response type
 */
export interface ApiResponse<T> {
  data: T | null;
  error: Error | PostgrestError | null;
  status: 'success' | 'error';
}

/**
 * Generic fetch function with proper error handling
 */
export async function fetchData<T>(
  tableName: string,
  query?: any
): Promise<ApiResponse<T>> {
  try {
    let queryBuilder = supabase.from(tableName).select('*');

    if (query) {
      if (query.filter) {
        Object.entries(query.filter).forEach(([key, value]) => {
          queryBuilder = queryBuilder.eq(key, value);
        });
      }

      if (query.order) {
        queryBuilder = queryBuilder.order(query.order.column, {
          ascending: query.order.ascending,
        });
      }

      if (query.limit) {
        queryBuilder = queryBuilder.limit(query.limit);
      }
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error(`[API] Error fetching data from ${tableName}:`, error);
      return { data: null, error, status: 'error' };
    }

    return { data: data as T, error: null, status: 'success' };
  } catch (error) {
    console.error(`[API] Exception fetching data from ${tableName}:`, error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
      status: 'error',
    };
  }
}

/**
 * Generic insert function with proper error handling
 */
export async function insertData<T>(
  tableName: string,
  data: any
): Promise<ApiResponse<T>> {
  try {
    const { data: result, error } = await supabase
      .from(tableName)
      .insert(data)
      .select();

    if (error) {
      console.error(`[API] Error inserting data into ${tableName}:`, error);
      return { data: null, error, status: 'error' };
    }

    return { data: result as T, error: null, status: 'success' };
  } catch (error) {
    console.error(`[API] Exception inserting data into ${tableName}:`, error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
      status: 'error',
    };
  }
}

/**
 * Generic update function with proper error handling
 */
export async function updateData<T>(
  tableName: string,
  id: string | number,
  data: any,
  idField: string = 'id'
): Promise<ApiResponse<T>> {
  try {
    const { data: result, error } = await supabase
      .from(tableName)
      .update(data)
      .eq(idField, id)
      .select();

    if (error) {
      console.error(`[API] Error updating data in ${tableName}:`, error);
      return { data: null, error, status: 'error' };
    }

    return { data: result as T, error: null, status: 'success' };
  } catch (error) {
    console.error(`[API] Exception updating data in ${tableName}:`, error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
      status: 'error',
    };
  }
}

/**
 * Generic upsert function with proper error handling
 */
export async function upsertData<T>(
  tableName: string,
  data: any,
  onConflict?: string
): Promise<ApiResponse<T>> {
  try {
    let query = supabase.from(tableName).upsert(data);
    
    if (onConflict) {
      query = query.onConflict(onConflict);
    }
    
    const { data: result, error } = await query.select();

    if (error) {
      console.error(`[API] Error upserting data in ${tableName}:`, error);
      return { data: null, error, status: 'error' };
    }

    return { data: result as T, error: null, status: 'success' };
  } catch (error) {
    console.error(`[API] Exception upserting data in ${tableName}:`, error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
      status: 'error',
    };
  }
}

/**
 * Generic delete function with proper error handling
 */
export async function deleteData<T>(
  tableName: string,
  id: string | number,
  idField: string = 'id'
): Promise<ApiResponse<T>> {
  try {
    const { data: result, error } = await supabase
      .from(tableName)
      .delete()
      .eq(idField, id)
      .select();

    if (error) {
      console.error(`[API] Error deleting data from ${tableName}:`, error);
      return { data: null, error, status: 'error' };
    }

    return { data: result as T, error: null, status: 'success' };
  } catch (error) {
    console.error(`[API] Exception deleting data from ${tableName}:`, error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
      status: 'error',
    };
  }
}

/**
 * Subscribe to real-time changes
 */
export function subscribeToChanges(
  tableName: string,
  callback: (payload: any) => void,
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*'
) {
  const channel = supabase
    .channel(`table-changes-${tableName}`)
    .on(
      'postgres_changes',
      {
        event,
        schema: 'public',
        table: tableName,
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
