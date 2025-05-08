import React, { useState, useRef, useEffect } from 'react';
import { Order, Bottle } from '../types/order';
import { formatPrice } from '../utils/price';
import { X } from 'lucide-react';
import useStaffStore from '../store/staffStore';

interface BottlesProps {
  order: Order;
  onUpdate: (bottles: Bottle[], tempBottle?: { name: string; price: string }) => void;
  disabled?: boolean;
}

const Bottles: React.FC<BottlesProps> = ({ order, onUpdate, disabled }) => {
  const { staff } = useStaffStore();
  const [selectedMainCasts, setSelectedMainCasts] = useState<string[]>([]);
  const [selectedHelpCasts, setSelectedHelpCasts] = useState<string[]>([]);
  const [showMainCastSelect, setShowMainCastSelect] = useState(false);
  const [showHelpCastSelect, setShowHelpCastSelect] = useState(false);
  const [editingBottleId, setEditingBottleId] = useState<number | null>(null);
  const [bottleNotes, setBottleNotes] = useState<{ [key: number]: string }>({});
  const [isNoteDebouncing, setIsNoteDebouncing] = useState<{ [key: number]: boolean }>({});
  const noteTimeoutRefs = useRef<{ [key: number]: NodeJS.Timeout }>({});
  const noteInputRefs = useRef<{ [key: number]: HTMLInputElement }>({});

  useEffect(() => {
    const initialNotes: { [key: number]: string } = {};
    order.bottles.forEach(bottle => {
      initialNotes[bottle.id] = bottle.note || '';
    });
    setBottleNotes(initialNotes);
  }, [order.bottles]);

  useEffect(() => {
    return () => {
      Object.values(noteTimeoutRefs.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, []);

  const handleAddBottle = () => {
    if (!order.tempBottle?.name || !order.tempBottle?.price) return;
    
    const newBottle: Bottle = {
      id: Date.now(),
      name: order.tempBottle.name,
      price: parseInt(order.tempBottle.price),
      mainCasts: [],
      helpCasts: [],
      note: ''
    };
    
    const newBottles = [...(order.bottles || []), newBottle];
    onUpdate(newBottles, { name: "", price: "" });
  };

  const handleRemoveBottle = (bottleId: number) => {
    const newBottles = order.bottles.filter(b => b.id !== bottleId);
    onUpdate(newBottles, order.tempBottle);
  };

  const handleTempInputChange = (field: 'name' | 'price', value: string) => {
    const currentTemp = order.tempBottle || { name: "", price: "" };
    const newTemp = {
      ...currentTemp,
      [field]: value
    };
    onUpdate(order.bottles, newTemp);
  };

  const handleMainCastToggle = (cast: string) => {
    setSelectedMainCasts(prev => 
      prev.includes(cast)
        ? prev.filter(c => c !== cast)
        : [...prev, cast]
    );
  };

  const handleHelpCastToggle = (cast: string) => {
    setSelectedHelpCasts(prev => 
      prev.includes(cast)
        ? prev.filter(c => c !== cast)
        : [...prev, cast]
    );
  };

  const startEditingCasts = (bottle: Bottle, type: 'main' | 'help') => {
    setEditingBottleId(bottle.id);
    if (type === 'main') {
      setSelectedMainCasts(bottle.mainCasts || []);
      setShowMainCastSelect(true);
      setShowHelpCastSelect(false);
    } else {
      setSelectedHelpCasts(bottle.helpCasts || []);
      setShowMainCastSelect(false);
      setShowHelpCastSelect(true);
    }
  };

  const handleCastSelectClose = () => {
    if (editingBottleId) {
      const updatedBottles = order.bottles.map(bottle => {
        if (bottle.id === editingBottleId) {
          return {
            ...bottle,
            mainCasts: showMainCastSelect ? selectedMainCasts : bottle.mainCasts,
            helpCasts: showHelpCastSelect ? selectedHelpCasts : bottle.helpCasts
          };
        }
        return bottle;
      });
      onUpdate(updatedBottles, order.tempBottle);
    }

    setShowMainCastSelect(false);
    setShowHelpCastSelect(false);
    setEditingBottleId(null);
    setSelectedMainCasts([]);
    setSelectedHelpCasts([]);
  };

  const handleNoteChange = (bottleId: number, note: string) => {
    setBottleNotes(prev => ({
      ...prev,
      [bottleId]: note
    }));
    setIsNoteDebouncing(prev => ({
      ...prev,
      [bottleId]: true
    }));

    if (noteTimeoutRefs.current[bottleId]) {
      clearTimeout(noteTimeoutRefs.current[bottleId]);
    }

    noteTimeoutRefs.current[bottleId] = setTimeout(() => {
      const updatedBottles = order.bottles.map(bottle => {
        if (bottle.id === bottleId) {
          return { ...bottle, note };
        }
        return bottle;
      });
      onUpdate(updatedBottles, order.tempBottle);
      setIsNoteDebouncing(prev => ({
        ...prev,
        [bottleId]: false
      }));
    }, 500);
  };

  const handleNoteFocus = (bottleId: number) => {
    const inputRef = noteInputRefs.current[bottleId];
    if (inputRef) {
      const rect = inputRef.getBoundingClientRect();
      const isVisible = (
        rect.top >= 0 &&
        rect.bottom <= window.innerHeight
      );

      if (!isVisible) {
        inputRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <h3 className="font-bold mb-3">ボトル</h3>
      
      {!disabled && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div>
            <label className="block text-xs text-gray-700 mb-1">ボトル名</label>
            <input 
              type="text" 
              className="border rounded-md p-2 w-full text-sm"
              placeholder="例: オリシャン"
              value={order.tempBottle?.name || ""}
              onChange={(e) => handleTempInputChange('name', e.target.value)}
              disabled={disabled}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-1">金額 (円)</label>
            <input 
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="border rounded-md p-2 w-full text-sm" 
              placeholder="例: 8000"
              value={order.tempBottle?.price || ""}
              onChange={(e) => {
                const numericValue = e.target.value.replace(/[^0-9]/g, '');
                handleTempInputChange('price', numericValue);
              }}
              disabled={disabled}
            />
          </div>
          <div className="flex items-end">
            <button 
              className="bg-blue-600 text-white py-2 px-3 rounded-md text-sm w-full"
              onClick={handleAddBottle}
              disabled={disabled}
            >
              追加
            </button>
          </div>
        </div>
      )}

      {(showMainCastSelect || showHelpCastSelect) && (
        <div className="bg-gray-50 p-3 rounded-md mb-3">
          <h4 className="font-bold text-sm mb-2">
            {showMainCastSelect ? '担当キャスト選択' : 'ヘルプキャスト選択'}
          </h4>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {staff.map(member => (
              <button
                key={member.id}
                className={`p-2 text-sm rounded-md ${
                  (showMainCastSelect ? selectedMainCasts : selectedHelpCasts).includes(member.name)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
                onClick={() => showMainCastSelect 
                  ? handleMainCastToggle(member.name)
                  : handleHelpCastToggle(member.name)
                }
              >
                {member.name}
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              className="text-sm text-gray-600"
              onClick={handleCastSelectClose}
            >
              確定
            </button>
          </div>
        </div>
      )}
      
      {order.bottles && order.bottles.map(bottle => (
        <div key={bottle.id} className="bg-blue-50 p-2 rounded-md mb-2">
          <div className="border-b border-blue-200 pb-2">
            <div className="flex justify-between items-center mb-2">
              <span>{bottle.name}</span>
              <div className="flex items-center">
                <span className="mr-2">¥{formatPrice(bottle.price)}</span>
                {!disabled && (
                  <button 
                    className="text-red-500"
                    onClick={() => handleRemoveBottle(bottle.id)}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-gray-600">担当キャスト</span>
                  {!disabled && (
                    <button
                      className="text-xs bg-purple-600 text-white px-2 py-1 rounded"
                      onClick={() => startEditingCasts(bottle, 'main')}
                    >
                      編集
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {bottle.mainCasts?.map(cast => (
                    <span key={cast} className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                      {cast}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-gray-600">ヘルプキャスト</span>
                  {!disabled && (
                    <button
                      className="text-xs bg-pink-600 text-white px-2 py-1 rounded"
                      onClick={() => startEditingCasts(bottle, 'help')}
                    >
                      編集
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {bottle.helpCasts?.map(cast => (
                    <span key={cast} className="bg-pink-100 text-pink-800 px-2 py-1 rounded text-xs">
                      {cast}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">備考</label>
                <div className="relative">
                  <input
                    ref={el => noteInputRefs.current[bottle.id] = el!}
                    type="text"
                    className={`border rounded-md p-1 w-full text-sm ${
                      isNoteDebouncing[bottle.id] ? 'bg-gray-50' : 'bg-white'
                    }`}
                    value={bottleNotes[bottle.id] || ''}
                    onChange={(e) => handleNoteChange(bottle.id, e.target.value)}
                    onFocus={() => handleNoteFocus(bottle.id)}
                    placeholder="備考を入力"
                    disabled={disabled}
                    style={{
                      WebkitAppearance: 'none',
                      appearance: 'none'
                    }}
                  />
                  {isNoteDebouncing[bottle.id] && (
                    <div className="absolute top-1/2 right-2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-800 border-t-transparent"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {(!order.bottles || order.bottles.length === 0) && (
        <div className="text-center text-gray-500 py-2 text-sm bg-blue-50 rounded-md">
          ボトルはまだありません
        </div>
      )}
    </div>
  );
};

export default Bottles;
