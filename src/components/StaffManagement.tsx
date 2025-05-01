import React, { useState } from 'react';
import { ArrowLeft, Plus, X, Edit2, Check, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';
import useStaffStore from '../store/staffStore';

interface StaffManagementProps {
  onBack: () => void;
}

const StaffManagement: React.FC<StaffManagementProps> = ({ onBack }) => {
  const { staff, isLoading, error, syncWithSupabase, addStaff, updateStaff, deleteStaff, moveStaff } = useStaffStore();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAdd = async () => {
    if (!newName.trim()) return;
    
    try {
      await addStaff({ id: crypto.randomUUID(), name: newName.trim(), sortOrder: 0 });
      setNewName('');
    } catch (error) {
      console.error('Error adding staff:', error);
    }
  };

  const startEditing = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;
    
    try {
      await updateStaff(id, editingName.trim());
      setEditingId(null);
      setEditingName('');
    } catch (error) {
      console.error('Error updating staff:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('このキャストを削除してもよろしいですか？')) {
      try {
        await deleteStaff(id);
      } catch (error) {
        console.error('Error deleting staff:', error);
      }
    }
  };

  const handleRefresh = async () => {
    try {
      await syncWithSupabase();
    } catch (error) {
      console.error('Error refreshing staff:', error);
    }
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    try {
      await moveStaff(id, direction);
    } catch (error) {
      console.error('Error moving staff:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-purple-800 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">キャスト管理</h1>
        <div className="flex items-center gap-2">
          <button
            className="bg-blue-600 text-white py-1 px-3 rounded-md text-sm flex items-center gap-2"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            更新
          </button>
          <button 
            className="bg-blue-600 text-white py-1 px-3 rounded-md text-sm flex items-center gap-2"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4" />
            戻る
          </button>
        </div>
      </header>

      <div className="p-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h2 className="font-bold mb-3">新規キャスト追加</h2>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 border rounded-md p-2"
              placeholder="キャスト名を入力"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button
              className="bg-purple-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
              onClick={handleAdd}
              disabled={!newName.trim() || isLoading}
            >
              <Plus className="w-4 h-4" />
              追加
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="font-bold mb-3">キャスト一覧</h2>
          {isLoading ? (
            <div className="text-center text-gray-500 py-4">
              読み込み中...
            </div>
          ) : staff.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              キャストが登録されていません
            </div>
          ) : (
            <div className="space-y-2">
              {staff.map((member, index) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between bg-gray-50 p-3 rounded-md"
                >
                  {editingId === member.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        className="flex-1 border rounded-md p-2"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdate(member.id)}
                        autoFocus
                      />
                      <button
                        className="text-green-600 p-1"
                        onClick={() => handleUpdate(member.id)}
                        disabled={isLoading}
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        className="text-gray-600 p-1"
                        onClick={() => setEditingId(null)}
                        disabled={isLoading}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-lg">{member.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <button
                            className="text-gray-600 p-1 hover:text-gray-800 disabled:opacity-50"
                            onClick={() => handleMove(member.id, 'up')}
                            disabled={index === 0 || isLoading}
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            className="text-gray-600 p-1 hover:text-gray-800 disabled:opacity-50"
                            onClick={() => handleMove(member.id, 'down')}
                            disabled={index === staff.length - 1 || isLoading}
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          className="text-blue-600 p-1"
                          onClick={() => startEditing(member.id, member.name)}
                          disabled={isLoading}
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          className="text-red-600 p-1"
                          onClick={() => handleDelete(member.id)}
                          disabled={isLoading}
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffManagement;