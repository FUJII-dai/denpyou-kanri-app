import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { getBusinessDate } from '../utils/businessHours';

interface OperationLogStore {
  addLog: (action: string, details?: any) => Promise<void>;
}

const useOperationLogStore = create<OperationLogStore>(() => ({
  addLog: async (action: string, details?: any) => {
    try {
      const businessDate = getBusinessDate();
      console.log('[OperationLogStore] Adding log:', { action, details, businessDate });

      const { data, error } = await supabase
        .from('operation_logs')
        .insert([{
          action,
          details,
          business_date: businessDate
        }])
        .select();

      if (error) {
        console.error('[OperationLogStore] Supabase error:', error);
        throw error;
      }

      console.log('[OperationLogStore] Log added successfully:', data);
    } catch (error) {
      console.error('[OperationLogStore] Error adding log:', error);
      // Don't throw the error here to prevent UI disruption
      // Just log it for debugging
    }
  }
}));

export default useOperationLogStore;