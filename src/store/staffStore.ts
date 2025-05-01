import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

interface Staff {
  id: string;
  name: string;
  sortOrder: number;
}

interface StaffState {
  staff: Staff[];
  isLoading: boolean;
  error: string | null;
  initialized: boolean;
  channel: ReturnType<typeof supabase.channel> | null;
  syncWithSupabase: () => Promise<void>;
  addStaff: (staff: Staff) => Promise<void>;
  updateStaff: (id: string, name: string) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;
  moveStaff: (id: string, direction: 'up' | 'down') => Promise<void>;
  cleanup: () => void;
  resetStore: () => void;
}

const customStorage = {
  ...createJSONStorage(() => localStorage),
  removeItem: (name: string) => {
    console.log('[StaffStore] Removing storage:', name);
    localStorage.removeItem(name);
  }
};

const useStaffStore = create(
  persist<StaffState>(
    (set, get) => ({
      staff: [],
      isLoading: false,
      error: null,
      initialized: false,
      channel: null,

      resetStore: () => {
        console.log('[StaffStore] Resetting store state');
        const channel = get().channel;
        if (channel) {
          channel.unsubscribe();
        }
        
        // Clear localStorage data
        customStorage.removeItem('staff-storage');
        
        set({
          staff: [],
          isLoading: false,
          error: null,
          initialized: false,
          channel: null
        });
      },

      syncWithSupabase: async () => {
        try {
          set({ isLoading: true, error: null });

          // 既存のチャネルをクリーンアップ
          get().cleanup();

          // 初期データを取得（sort_orderでソート）
          const { data, error } = await supabase
            .from('staff')
            .select('*')
            .order('sort_order', { ascending: true });

          if (error) throw error;

          // リアルタイム更新を購読
          const channel = supabase
            .channel('staff_changes')
            .on('postgres_changes', { 
              event: '*', 
              schema: 'public', 
              table: 'staff' 
            }, async () => {
              // 変更があった場合は再取得（ソート順を維持）
              const { data: refreshedData, error: refreshError } = await supabase
                .from('staff')
                .select('*')
                .order('sort_order', { ascending: true });

              if (!refreshError && refreshedData) {
                set({
                  staff: refreshedData.map(staff => ({
                    id: staff.id,
                    name: staff.name,
                    sortOrder: staff.sort_order
                  }))
                });
              }
            })
            .subscribe();

          set({ 
            staff: data.map(staff => ({
              id: staff.id,
              name: staff.name,
              sortOrder: staff.sort_order
            })),
            isLoading: false,
            initialized: true,
            channel
          });
        } catch (error) {
          console.error('Error syncing with Supabase:', error);
          set({ 
            error: 'スタッフデータの同期に失敗しました',
            isLoading: false 
          });
        }
      },

      addStaff: async (newStaff) => {
        try {
          set({ error: null });

          // 最大のsort_orderを取得
          const maxSortOrder = Math.max(...get().staff.map(s => s.sortOrder), -1);

          // 一時的にローカルステートを更新
          set(state => ({
            staff: [...state.staff, { ...newStaff, sortOrder: maxSortOrder + 1 }]
          }));

          const { error } = await supabase
            .from('staff')
            .insert([{
              id: newStaff.id,
              name: newStaff.name,
              sort_order: maxSortOrder + 1
            }]);

          if (error) {
            // エラーの場合は元に戻す
            set(state => ({
              staff: state.staff.filter(s => s.id !== newStaff.id)
            }));
            throw error;
          }
        } catch (error) {
          console.error('Error adding staff:', error);
          set({ error: 'スタッフの追加に失敗しました' });
          throw error;
        }
      },

      updateStaff: async (id: string, name: string) => {
        try {
          set({ error: null });

          // 一時的にローカルステートを更新
          const oldStaff = get().staff.find(s => s.id === id);
          set(state => ({
            staff: state.staff.map(s => 
              s.id === id ? { ...s, name } : s
            )
          }));

          const { error } = await supabase
            .from('staff')
            .update({ name })
            .eq('id', id);

          if (error) {
            // エラーの場合は元に戻す
            if (oldStaff) {
              set(state => ({
                staff: state.staff.map(s =>
                  s.id === id ? oldStaff : s
                )
              }));
            }
            throw error;
          }
        } catch (error) {
          console.error('Error updating staff:', error);
          set({ error: 'スタッフの更新に失敗しました' });
          throw error;
        }
      },

      deleteStaff: async (id: string) => {
        try {
          set({ error: null });

          // 一時的にローカルステートを更新
          const oldStaff = get().staff.find(s => s.id === id);
          set(state => ({
            staff: state.staff.filter(s => s.id !== id)
          }));

          const { error } = await supabase
            .from('staff')
            .delete()
            .eq('id', id);

          if (error) {
            // エラーの場合は元に戻す
            if (oldStaff) {
              set(state => ({
                staff: [...state.staff, oldStaff]
              }));
            }
            throw error;
          }
        } catch (error) {
          console.error('Error deleting staff:', error);
          set({ error: 'スタッフの削除に失敗しました' });
          throw error;
        }
      },

      moveStaff: async (id: string, direction: 'up' | 'down') => {
        try {
          const currentStaff = get().staff;
          const index = currentStaff.findIndex(staff => staff.id === id);
          if (index === -1) return;

          // 移動先のインデックスを計算
          const newIndex = direction === 'up' ? index - 1 : index + 1;
          if (newIndex < 0 || newIndex >= currentStaff.length) return;

          // 入れ替える2つのスタッフのsort_orderを取得
          const currentOrder = currentStaff[index].sortOrder;
          const targetOrder = currentStaff[newIndex].sortOrder;

          // 配列を更新
          const newStaff = [...currentStaff];
          [newStaff[index], newStaff[newIndex]] = [newStaff[newIndex], newStaff[index]];
          newStaff[index].sortOrder = currentOrder;
          newStaff[newIndex].sortOrder = targetOrder;

          // 一時的に状態を更新
          set({ staff: newStaff });

          // データベースを更新
          const { error: error1 } = await supabase
            .from('staff')
            .update({ sort_order: targetOrder })
            .eq('id', id);

          const { error: error2 } = await supabase
            .from('staff')
            .update({ sort_order: currentOrder })
            .eq('id', currentStaff[newIndex].id);

          if (error1 || error2) {
            // エラーの場合は元に戻す
            set({ staff: currentStaff });
            throw error1 || error2;
          }
        } catch (error) {
          console.error('Error moving staff:', error);
          set({ error: 'スタッフの並び替えに失敗しました' });
          throw error;
        }
      },

      cleanup: () => {
        const channel = get().channel;
        if (channel) {
          channel.unsubscribe();
          set({ channel: null });
        }
      }
    }),
    {
      name: 'staff-storage',
      storage: customStorage,
      partialize: (state) => ({
        staff: state.staff,
        initialized: state.initialized
      })
    }
  )
);

export default useStaffStore;