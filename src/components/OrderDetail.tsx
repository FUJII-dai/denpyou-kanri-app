import React, { useState, useEffect, useRef } from 'react';
import { Order, PaymentMethod, PaymentDetails } from '../types/order';
import { useExtension } from '../hooks/useExtension';
import PaymentMethodModal from './PaymentMethodModal';
import PaymentConfirmationModal from './PaymentConfirmationModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import CastDrinks from './CastDrinks';
import Bottles from './Bottles';
import Foods from './Foods';
import Karaoke from './Karaoke';
import useOrderStore from '../store/orderStore';
import useStaffStore from '../store/staffStore';
import { calculateTotal, calculateServiceCharge, formatPrice } from '../utils/price';
import { X, Clock, Trash2, PenSquare, Edit2, Plus, Minus, ArrowUpLeft } from 'lucide-react';
import { adjustTime } from '../utils/time';
import { getBusinessDate } from '../utils/businessHours';

interface OrderDetailProps {
  order: Order;
  onClose: () => void;
  scrollToSection?: string;
}

const OrderDetail: React.FC<OrderDetailProps> = ({ order, onClose, scrollToSection }) => {
  if (!order) {
    return null;
  }

  const { updateOrder, completeOrder, deleteOrder } = useOrderStore();
  const { staff } = useStaffStore();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customerName, setCustomerName] = useState(order.customerName || '');
  const [isEditingStartTime, setIsEditingStartTime] = useState(false);
  const [startTime, setStartTime] = useState(order.startTime);
  const [editingCastType, setEditingCastType] = useState<'catch' | 'referral' | null>(null);
  const [selectedCasts, setSelectedCasts] = useState<string[]>([]);
  const [pendingPayment, setPendingPayment] = useState<{
    method: PaymentMethod;
    details: PaymentDetails;
  } | null>(null);
  const [note, setNote] = useState(order.note || '');
  const [isNoteDebouncing, setIsNoteDebouncing] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const noteTimeoutRef = useRef<number>();
  const bottlesRef = useRef<HTMLDivElement>(null);

  const canEdit = (field: string): boolean => {
    if (order.status !== 'completed') return true;

    // 営業時間が終了している場合は編集不可
    const currentBusinessDate = getBusinessDate();
    
    // 完了済み伝票は当日の営業時間内のみ編集可能
    if (order.status === 'completed') {
      const orderBusinessDate = getBusinessDate(order.updated_at ? new Date(order.updated_at) : new Date());
      if (orderBusinessDate !== currentBusinessDate) {
        return false;
      }
    }

    const editableFields = [
      'customerName',
      'referralCasts',
      'catchCasts',
      'bottleMainCasts',
      'bottleHelpCasts',
      'bottleNote',
      'note',
      'status'
    ];

    return editableFields.includes(field);
  };

  useEffect(() => {
    if (scrollToSection === 'bottles' && bottlesRef.current) {
      bottlesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scrollToSection]);

  useEffect(() => {
    if (editingCastType === 'catch') {
      setSelectedCasts(Array.isArray(order.catchCasts) ? [...order.catchCasts] : []);
    } else if (editingCastType === 'referral') {
      setSelectedCasts(Array.isArray(order.referralCasts) ? [...order.referralCasts] : []);
    }
  }, [editingCastType, order.catchCasts, order.referralCasts]);

  useEffect(() => {
    return () => {
      if (noteTimeoutRef.current) {
        window.clearTimeout(noteTimeoutRef.current);
      }
    };
  }, []);

  const {
    showGuestSelect,
    selectedGuests,
    setShowGuestSelect,
    setSelectedGuests,
    addExtension,
    handleExtensionClick
  } = useExtension(order);

  const handleDelete = () => {
    deleteOrder(order.id);
    onClose();
  };

  const handleCustomerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setCustomerName(newName);
    const updatedOrder = {
      ...order,
      customerName: newName
    };
    updateOrder(updatedOrder);
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setStartTime(newTime);
  };

  const handleSaveStartTime = () => {
    const [oldH, oldM] = order.startTime.split(':').map(Number);
    const [newH, newM] = startTime.split(':').map(Number);
    const oldMinutes = oldH * 60 + oldM;
    const newMinutes = newH * 60 + newM;
    const timeDiff = newMinutes - oldMinutes;

    const adjustedExtensions = order.extensions.map(ext => ({
      ...ext,
      endTime: adjustTime(ext.endTime, timeDiff)
    }));

    const adjustedEndTime = adjustTime(order.endTime, timeDiff);

    const updatedOrder = {
      ...order,
      startTime,
      endTime: adjustedEndTime,
      extensions: adjustedExtensions
    };
    updateOrder(updatedOrder);
    setIsEditingStartTime(false);
  };

  const handleCastToggle = (cast: string) => {
    setSelectedCasts(prev => 
      prev.includes(cast)
        ? prev.filter(c => c !== cast)
        : [...prev, cast]
    );
  };

  const handleSaveCasts = () => {
    const updatedOrder = {
      ...order,
      catchCasts: editingCastType === 'catch' ? [...selectedCasts] : order.catchCasts,
      referralCasts: editingCastType === 'referral' ? [...selectedCasts] : order.referralCasts
    };
    updateOrder(updatedOrder);
    setEditingCastType(null);
    setSelectedCasts([]);
  };

  const handleGuestChange = (change: number) => {
    const newValue = Math.max(1, selectedGuests + change);
    setSelectedGuests(newValue);
  };

  const handleDrinkTypeChange = (type: string, price: number) => {
    const updatedOrder = {
      ...order,
      drinkType: type,
      drinkPrice: price,
      totalAmount: calculateTotal({ ...order, drinkPrice: price })
    };
    updateOrder(updatedOrder);
  };

  const handleCustomPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const price = parseInt(e.target.value) || 0;
    handleDrinkTypeChange('手書き入力', price);
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNote = e.target.value;
    setNote(newNote);
    setIsNoteDebouncing(true);

    if (noteTimeoutRef.current) {
      window.clearTimeout(noteTimeoutRef.current);
    }

    noteTimeoutRef.current = window.setTimeout(() => {
      const updatedOrder = {
        ...order,
        note: newNote
      };
      updateOrder(updatedOrder);
      setIsNoteDebouncing(false);
    }, 500);
  };

  const handleNoteFocus = () => {
    if (noteRef.current) {
      const rect = noteRef.current.getBoundingClientRect();
      const isVisible = (
        rect.top >= 0 &&
        rect.bottom <= window.innerHeight
      );

      if (!isVisible) {
        noteRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleExtensionConfirm = () => {
    const { extension, endTime, totalPrice } = addExtension();
    const updatedOrder = {
      ...order,
      extensions: [...order.extensions, extension],
      endTime,
      totalAmount: totalPrice
    };
    updateOrder(updatedOrder);
    setShowGuestSelect(false);
  };

  const handleDeleteExtension = (extensionId: number) => {
    const extensionIndex = order.extensions.findIndex(ext => ext.id === extensionId);
    if (extensionIndex === -1) return;

    const newExtensions = order.extensions.filter((_, index) => index < extensionIndex);
    const lastExtension = newExtensions[newExtensions.length - 1];
    const newEndTime = lastExtension ? lastExtension.endTime : adjustTime(order.startTime, 60);

    const updatedOrder = {
      ...order,
      extensions: newExtensions,
      endTime: newEndTime,
      totalAmount: calculateTotal({
        ...order,
        extensions: newExtensions
      })
    };
    updateOrder(updatedOrder);
  };

  const handleReturnToActive = () => {
    // 営業時間が終了している場合は接客中に戻せない
    const currentBusinessDate = getBusinessDate();
    const orderBusinessDate = getBusinessDate(order.updated_at ? new Date(order.updated_at) : new Date());
    
    if (orderBusinessDate !== currentBusinessDate) {
      alert('営業時間が終了した伝票は接客中に戻せません');
      return;
    }

    const updatedOrder = {
      ...order,
      status: 'active' as const,
      paymentMethod: undefined,
      paymentDetails: undefined
    };
    updateOrder(updatedOrder);
    onClose();
  };

  const handlePaymentSelect = (method: PaymentMethod, details: PaymentDetails) => {
    setPendingPayment({ method, details });
    setShowPaymentModal(false);
    setShowPaymentConfirmation(true);
  };

  const handlePaymentConfirm = () => {
    if (!pendingPayment) return;
    completeOrder(order.id, pendingPayment.method, pendingPayment.details);
    setPendingPayment(null);
    setShowPaymentConfirmation(false);
    onClose();
  };

  const handlePaymentCancel = () => {
    setPendingPayment(null);
    setShowPaymentConfirmation(false);
    setShowPaymentModal(true);
  };

  const handleCastDrinksUpdate = (castDrinks: any[], tempCastDrink?: { cast: string; count: string }) => {
    const updatedOrder = {
      ...order,
      castDrinks,
      tempCastDrink,
      totalAmount: calculateTotal({ ...order, castDrinks })
    };
    updateOrder(updatedOrder);
  };

  const handleBottlesUpdate = (bottles: any[], tempBottle?: { name: string; price: string }) => {
    const updatedOrder = {
      ...order,
      bottles,
      tempBottle,
      totalAmount: calculateTotal({ ...order, bottles })
    };
    updateOrder(updatedOrder);
  };

  const handleFoodsUpdate = (foods: any[], tempFood?: { name: string; price: string }) => {
    const updatedOrder = {
      ...order,
      foods,
      tempFood,
      totalAmount: calculateTotal({ ...order, foods })
    };
    updateOrder(updatedOrder);
  };

  const handleKaraokeUpdate = (karaokeCount: number) => {
    const updatedOrder = {
      ...order,
      karaokeCount,
      totalAmount: calculateTotal({ ...order, karaokeCount })
    };
    updateOrder(updatedOrder);
  };

  const total = calculateTotal(order);
  const serviceCharge = calculateServiceCharge(total);
  const subtotalWithService = total + serviceCharge;

  let finalTotal = subtotalWithService;

  if (pendingPayment) {
    if (pendingPayment.method === 'cash') {
      finalTotal = Math.floor(subtotalWithService / 100) * 100;
    } else if ((pendingPayment.method === 'card' || pendingPayment.method === 'partial_cash') && pendingPayment.details.hasCardFee) {
      finalTotal += pendingPayment.details.cardFee || 0;
    }
  } else if (order.status === 'completed') {
    if (order.paymentMethod === 'cash') {
      finalTotal = Math.floor(subtotalWithService / 100) * 100;
    } else if ((order.paymentMethod === 'card' || order.paymentMethod === 'partial_cash') && order.paymentDetails?.hasCardFee) {
      finalTotal += order.paymentDetails.cardFee || 0;
    }
  }

  const baseSetPrice = order.guests * order.drinkPrice;
  const totalSetPrice = baseSetPrice + order.extensions.reduce((sum, ext) => sum + ext.price, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
        <header className="bg-purple-800 text-white p-4 flex justify-between items-center sticky top-0">
          <h2 className="text-xl font-bold">
            <span className="text-sm text-gray-200 mr-2">#{order.orderNumber}</span>
            {order.tableType} {order.tableNum} ({order.guests}名)
          </h2>
          <div className="flex items-center gap-2">
            {order.status === 'active' && (
              <button
                className="bg-red-600 text-white p-2 rounded-md flex items-center gap-1 text-sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4" />
                <span>削除</span>
              </button>
            )}
            <button onClick={onClose}>
              <X className="w-6 h-6" />
            </button>
          </div>
        </header>

        <div className="p-4">
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  お客様名
                </label>
                <input
                  type="text"
                  className={`border rounded-md p-2 w-full ${!canEdit('customerName') && 'bg-gray-100'}`}
                  value={customerName}
                  onChange={handleCustomerNameChange}
                  placeholder="お客様名を入力"
                  disabled={!canEdit('customerName')}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    紹介
                  </label>
                  <button
                    className={`text-blue-600 text-sm flex items-center gap-1 ${!canEdit('referralCasts') && 'opacity-50 cursor-not-allowed'}`}
                    onClick={() => canEdit('referralCasts') && setEditingCastType('referral')}
                    disabled={!canEdit('referralCasts')}
                  >
                    <Edit2 className="w-4 h-4" />
                    編集
                  </button>
                </div>
                <div className="flex gap-1">
                  {order.referralCasts?.length > 0 ? (
                    order.referralCasts.map(cast => (
                      <span key={cast} className="bg-pink-100 text-pink-800 px-2 py-1 rounded text-xs">
                        {cast}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-sm">未設定</span>
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    キャッチ
                  </label>
                  <button
                    className={`text-blue-600 text-sm flex items-center gap-1 ${!canEdit('catchCasts') && 'opacity-50 cursor-not-allowed'}`}
                    onClick={() => canEdit('catchCasts') && setEditingCastType('catch')}
                    disabled={!canEdit('catchCasts')}
                  >
                    <Edit2 className="w-4 h-4" />
                    編集
                  </button>
                </div>
                <div className="flex gap-1">
                  {order.catchCasts?.length > 0 ? (
                    order.catchCasts.map(cast => (
                      <span key={cast} className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                        {cast}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-sm">未設定</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {editingCastType && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
              <div className="bg-white rounded-lg p-6 w-[480px] max-w-[90vw]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">
                    {editingCastType === 'catch' ? 'キャッチ編集' : '紹介編集'}
                  </h3>
                  <button onClick={() => setEditingCastType(null)}>
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="mb-6">
                  <div className="grid grid-cols-3 gap-2">
                    {staff.map(member => (
                      <button
                        key={member.id}
                        className={`p-2 text-sm rounded-md ${
                          selectedCasts.includes(member.name)
                            ? editingCastType === 'catch' ? 'bg-purple-600 text-white' : 'bg-pink-600 text-white'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                        onClick={() => handleCastToggle(member.name)}
                      >
                        {member.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md"
                    onClick={() => setEditingCastType(null)}
                  >
                    キャンセル
                  </button>
                  <button
                    className={`flex-1 text-white py-2 rounded-md ${
                      editingCastType === 'catch' ? 'bg-purple-600' : 'bg-pink-600'
                    }`}
                    onClick={handleSaveCasts}
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-600">入店時間:</span>
              </div>
              {isEditingStartTime ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    className="border rounded-md p-1 text-sm"
                    value={startTime}
                    onChange={handleStartTimeChange}
                    disabled={order.status === 'completed'}
                  />
                  <button
                    className="text-blue-600 text-sm px-2 py-1"
                    onClick={handleSaveStartTime}
                    disabled={order.status === 'completed'}
                  >
                    保存
                  </button>
                  <button
                    className="text-gray-600 text-sm px-2 py-1"
                    onClick={() => {
                      setStartTime(order.startTime);
                      setIsEditingStartTime(false);
                    }}
                  >
                    キャンセル
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm">{order.startTime}</span>
                  {order.status !== 'completed' && (
                    <button
                      className="text-blue-600 text-sm"
                      onClick={() => setIsEditingStartTime(true)}
                    >
                      編集
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              終了: {order.endTime}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <h3 className="font-bold mb-3">セット料金</h3>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <button
                className={`py-2 px-3 rounded-md text-sm ${
                  order.drinkType === '60分1000円' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-100'
                }`}
                onClick={() => handleDrinkTypeChange('60分1000円', 1000)}
                disabled={order.status === 'completed'}
              >
                60分1000円
              </button>
              <button
                className={`py-2 px-3 rounded-md text-sm ${
                  order.drinkType === '60分1500円' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-100'
                }`}
                onClick={() => handleDrinkTypeChange('60分1500円', 1500)}
                disabled={order.status === 'completed'}
              >
                60分1500円
              </button>
              <div>
                <input
                  type="number"
                  className="border rounded-md p-2 w-full text-sm"
                  placeholder="手書き入力"
                  value={order.drinkType === '手書き入力' ? order.drinkPrice : ''}
                  onChange={handleCustomPriceChange}
                  disabled={order.status === 'completed'}
                />
              </div>
            </div>
            <div className="text-right text-sm text-gray-600">
              基本セット料金: ¥{formatPrice(baseSetPrice)}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold">延長</h3>
              {order.status !== 'completed' && (
                <button
                  className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm"
                  onClick={handleExtensionClick}
                >
                  延長する
                </button>
              )}
            </div>

            {showGuestSelect && (
              <div className="bg-gray-100 p-3 rounded-md mb-3">
                <div className="mb-2">
                  <label className="block text-sm mb-1">延長人数</label>
                  <div className="flex items-center gap-4">
                    <button
                      className="text-purple-600 hover:text-purple-800 p-1"
                      onClick={() => handleGuestChange(-1)}
                      disabled={selectedGuests <= 1}
                    >
                      <Minus className="w-6 h-6" />
                    </button>
                    <span className="text-2xl font-medium w-12 text-center">
                      {selectedGuests}
                    </span>
                    <button
                      className="text-purple-600 hover:text-purple-800 p-1"
                      onClick={() => handleGuestChange(1)}
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                    <span className="text-gray-600">名</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="bg-gray-500 text-white px-3 py-1 rounded-md text-sm flex-1"
                    onClick={() => setShowGuestSelect(false)}
                  >
                    キャンセル
                  </button>
                  <button
                    className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm flex-1"
                    onClick={handleExtensionConfirm}
                  >
                    確定
                  </button>
                </div>
              </div>
            )}

            {order.extensions.map((ext, index) => (
              <div key={ext.id} className="flex justify-between items-center text-sm mb-2 last:mb-0">
                <span>延長{index + 1}回目 ({ext.guests}名)</span>
                <div className="flex items-center gap-4">
                  <span className="text-gray-600">〜{ext.endTime}</span>
                  <span>¥{formatPrice(ext.price)}</span>
                  <button
                    className="text-red-500 hover:text-red-700"
                    onClick={() => handleDeleteExtension(ext.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="flex justify-between text-sm font-bold">
                <span>セット料金合計</span>
                <span>¥{formatPrice(totalSetPrice)}</span>
              </div>
            </div>
          </div>

          <CastDrinks 
            order={order} 
            onUpdate={handleCastDrinksUpdate}
            disabled={order.status === 'completed'}
          />
          
          <div ref={bottlesRef}>
            <Bottles 
              order={order} 
              onUpdate={handleBottlesUpdate}
              disabled={order.status === 'completed'}
            />
          </div>
          
          <Foods 
            order={order} 
            onUpdate={handleFoodsUpdate}
            disabled={order.status === 'completed'}
          />

          <Karaoke 
            order={order} 
            onUpdate={handleKaraokeUpdate}
            disabled={order.status === 'completed'}
          />

          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <h3 className="font-bold mb-2">備考</h3>
            <div className="relative">
              <textarea
                ref={noteRef}
                className={`w-full border rounded-md p-2 min-h-[100px] ${
                  isNoteDebouncing ? 'bg-gray-50' : 'bg-white'
                }`}
                value={note}
                onChange={handleNoteChange}
                onFocus={handleNoteFocus}
                placeholder="備考を入力してください"
                style={{
                  WebkitAppearance: 'none',
                  resize: 'vertical'
                }}
              />
              {isNoteDebouncing && (
                <div className="absolute top-2 right-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-800 border-t-transparent"></div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between mb-2">
              <span>小計</span>
              <span>¥{formatPrice(total)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>サービス料 (15%)</span>
              <span>¥{formatPrice(serviceCharge)}</span>
            </div>
            {(pendingPayment?.details.hasCardFee || order.paymentDetails?.hasCardFee) && (
              <div className="flex justify-between mb-2">
                <span>カード手数料 (10%)</span>
                <span>¥{formatPrice(pendingPayment?.details.cardFee || order.paymentDetails?.cardFee || 0)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span>合計</span>
              <span>¥{formatPrice(finalTotal)}</span>
            </div>

            {order.status === 'active' ? (
              <button
                className="bg-pink-600 text-white w-full py-3 rounded-md mt-4"
                onClick={() => setShowPaymentModal(true)}
              >
                会計する
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <button
                  className="bg-blue-600 text-white py-3 rounded-md flex items-center justify-center gap-2"
                  onClick={onClose}
                >
                  <PenSquare className="w-4 h-4" />
                  編集を終了
                </button>
                {canEdit('status') && (
                  <button
                    className="bg-purple-600 text-white py-3 rounded-md flex items-center justify-center gap-2"
                    onClick={handleReturnToActive}
                  >
                    <ArrowUpLeft className="w-4 h-4" />
                    接客中に戻す
                  
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <DeleteConfirmModal
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
      
      {showPaymentModal && (
        <PaymentMethodModal
          onSelect={handlePaymentSelect}
          onClose={() => setShowPaymentModal(false)}
          totalAmount={finalTotal}
        />
      )}

      {showPaymentConfirmation && pendingPayment && (
        <PaymentConfirmationModal
          order={order}
          paymentMethod={pendingPayment.method}
          paymentDetails={pendingPayment.details}
          finalTotal={finalTotal}
          onConfirm={handlePaymentConfirm}
          onBack={handlePaymentCancel}
        />
      )}
    </div>
  );
};

export default OrderDetail;