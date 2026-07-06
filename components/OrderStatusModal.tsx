'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Clock, Flame, MapPin, Store, ThumbsUp, XCircle, ChevronRight, Phone } from 'lucide-react';
import axios from 'axios';

interface OrderStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any; // Order payload/document
  onDismiss: () => void;
}

type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export default function OrderStatusModal({ isOpen, onClose, order, onDismiss }: OrderStatusModalProps) {
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>('pending');
  const [liveOrder, setLiveOrder] = useState<any>(order);
  const [isSimulated, setIsSimulated] = useState(false);

  // Sync state with order prop
  useEffect(() => {
    if (order) {
      setLiveOrder(order);
      setCurrentStatus(order.status || 'pending');
    }
  }, [order]);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Poll order status from API or simulate if offline
  useEffect(() => {
    if (!isOpen || !liveOrder) return;

    let pollInterval: NodeJS.Timeout;
    let simulateInterval: NodeJS.Timeout;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const orderId = liveOrder._id || liveOrder.id;

    if (orderId && !isSimulated) {
      // If we have an ID, poll from backend
      const checkStatus = async () => {
        try {
          const res = await axios.get(`${apiUrl}/orders/${orderId}`);
          if (res.data.success && res.data.data) {
            setLiveOrder(res.data.data);
            setCurrentStatus(res.data.data.status);
          }
        } catch (err) {
          console.warn('Could not poll live order status, switching to local simulation', err);
          setIsSimulated(true);
        }
      };

      // Initial check
      checkStatus();
      pollInterval = setInterval(checkStatus, 5000); // Poll every 5s
    } else {
      // If no ID (local offline fallback) or switched to simulation
      setIsSimulated(true);
      
      const statusCycle: OrderStatus[] = ['pending', 'preparing', 'ready', 'completed'];
      let currentIdx = statusCycle.indexOf(currentStatus);
      if (currentIdx === -1) currentIdx = 0;

      simulateInterval = setInterval(() => {
        if (currentIdx < statusCycle.length - 1) {
          currentIdx += 1;
          const nextStatus = statusCycle[currentIdx];
          setCurrentStatus(nextStatus);
          
          // Update local status in liveOrder object
          setLiveOrder((prev: any) => ({
            ...prev,
            status: nextStatus,
          }));
        } else {
          clearInterval(simulateInterval);
        }
      }, 15000); // Advance status every 15s in simulation mode
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (simulateInterval) clearInterval(simulateInterval);
    };
  }, [isOpen, liveOrder, isSimulated, currentStatus]);

  if (!isOpen || !liveOrder) return null;

  const isDelivery = liveOrder.orderType === 'delivery';

  // Helper for tracking steps
  const steps = [
    {
      key: 'pending',
      label: 'Order Placed',
      description: 'Received & waiting for confirmation',
      icon: Clock,
      color: 'text-amber-500 bg-amber-50 border-amber-200',
    },
    {
      key: 'preparing',
      label: 'Preparing',
      description: 'Kitchen is cooking your meal',
      icon: Flame,
      color: 'text-orange-500 bg-orange-50 border-orange-200',
    },
    {
      key: isDelivery ? 'ready' : 'ready', // ready = out for delivery or ready for pickup
      label: isDelivery ? 'Out for Delivery' : 'Ready for Pickup',
      description: isDelivery ? 'Estimated arrival: ~1 hour' : 'Pickup at Strathmore counter',
      icon: isDelivery ? MapPin : Store,
      color: 'text-blue-500 bg-blue-50 border-blue-200',
    },
    {
      key: 'completed',
      label: 'Delivered',
      description: 'Thank you for ordering!',
      icon: ThumbsUp,
      color: 'text-emerald-500 bg-emerald-50 border-emerald-200',
    },
  ];

  const getStatusIndex = (status: OrderStatus) => {
    if (status === 'cancelled') return -1;
    if (status === 'ready') return 2;
    if (status === 'completed') return 3;
    if (status === 'preparing') return 1;
    return 0; // pending
  };

  const currentStepIdx = getStatusIndex(currentStatus);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-md animate-fade-in" />

      {/* Modal Shell */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl z-10 animate-scale-up flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-neutral-800">Live Order Tracker</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 hover:bg-neutral-200 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          
          {/* Hero Banner */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 border border-emerald-100 animate-bounce">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-sm font-black text-neutral-900">
              {currentStatus === 'completed'
                ? 'Order Completed!'
                : currentStatus === 'cancelled'
                ? 'Order Cancelled'
                : 'Order Placed Successfully!'}
            </h3>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none">
              Order No: #{liveOrder.orderNumber || 'Online-' + Math.floor(100 + Math.random() * 900)}
            </p>
            {isSimulated && (
              <span className="inline-block bg-neutral-100 text-neutral-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-neutral-200 mt-1">
                Demo Simulation Mode
              </span>
            )}
          </div>

          {/* Cancelled Alert */}
          {currentStatus === 'cancelled' ? (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700">
              <XCircle className="flex-shrink-0" size={18} />
              <div className="min-w-0">
                <p className="text-xs font-bold">This order was cancelled</p>
                <p className="text-[10px] opacity-90 mt-0.5">Please contact the branch at (587) 365-5401 for assistance.</p>
              </div>
            </div>
          ) : (
            /* Progress Tracker timeline */
            <div className="relative pl-7 space-y-6 border-l-2 border-neutral-100 ml-4 py-2">
              {steps.map((step, idx) => {
                const isActive = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                const StepIcon = step.icon;

                return (
                  <div key={step.key} className="relative group">
                    {/* Circle Anchor indicator */}
                    <div
                      className={`absolute -left-[37px] top-0.5 w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                        isCurrent
                          ? 'bg-brand-primary border-brand-primary text-white scale-110 shadow-md shadow-brand-primary/20'
                          : isActive
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'bg-white border-neutral-200 text-neutral-400'
                      }`}
                    >
                      <StepIcon size={12} strokeWidth={2.5} />
                    </div>

                    <div className="space-y-0.5">
                      <h4
                        className={`text-xs font-black transition-colors ${
                          isActive ? 'text-neutral-800' : 'text-neutral-400'
                        }`}
                      >
                        {step.label}
                      </h4>
                      <p
                        className={`text-[9.5px] font-medium transition-colors ${
                          isActive ? 'text-neutral-500' : 'text-neutral-400'
                        }`}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Delivery Specific notice */}
          {isDelivery && currentStatus === 'preparing' && (
            <div className="bg-orange-50/40 border border-orange-100/50 p-3.5 rounded-2xl text-[10px] text-neutral-600 font-semibold space-y-1">
              <p className="text-brand-primary uppercase text-[8.5px] font-black tracking-wider">Estimated Delivery Notice</p>
              <p className="leading-relaxed">
                Strathmore Branch offers flat-rate delivery. The courier will deliver your food within <span className="text-brand-primary">1 hour</span> of food preparation completion.
              </p>
            </div>
          )}

          {/* Order Summary details */}
          <div className="border border-neutral-100 rounded-2xl overflow-hidden bg-neutral-50/50">
            <div className="bg-neutral-100 px-4 py-2 border-b border-neutral-200/50 flex justify-between text-[9px] font-black text-neutral-500 uppercase tracking-widest">
              <span>Order Summary</span>
              <span>{isDelivery ? 'Delivery' : 'Pickup'}</span>
            </div>
            
            <div className="p-4 space-y-3">
              <div className="divide-y divide-neutral-100 max-h-[140px] overflow-y-auto pr-0.5 no-scrollbar">
                {liveOrder.items?.map((item: any, idx: number) => (
                  <div key={idx} className="py-2 flex justify-between text-xs font-semibold text-neutral-700 first:pt-0 last:pb-0">
                    <div className="min-w-0 pr-4">
                      <span>{item.name}</span>
                      <span className="text-[10px] text-neutral-400 ml-1">x{item.quantity}</span>
                    </div>
                    <span className="text-neutral-800 font-bold">${item.totalPrice.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-neutral-200 pt-3 flex justify-between items-center text-xs font-black text-neutral-800">
                <span>Total Amount Paid</span>
                <span className="text-sm text-brand-primary">${liveOrder.total?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Customer delivery / pickup location card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-neutral-100 pt-4">
            <div className="space-y-1">
              <p className="text-[8.5px] font-black text-neutral-400 uppercase tracking-wider">Customer Details</p>
              <p className="text-xs font-bold text-neutral-800">{liveOrder.customer?.name}</p>
              <p className="text-[10px] text-neutral-500 flex items-center gap-1">
                <Phone size={10} />
                {liveOrder.customer?.phone}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-[8.5px] font-black text-neutral-400 uppercase tracking-wider">
                {isDelivery ? 'Delivery Address' : 'Pickup Location'}
              </p>
              {isDelivery ? (
                <p className="text-[10px] text-neutral-700 font-medium leading-tight">
                  {liveOrder.customer?.address}
                </p>
              ) : (
                <div className="text-[10px] text-neutral-700 font-semibold space-y-0.5">
                  <p className="text-brand-primary font-bold">Strathmore Branch Counter</p>
                  <p className="text-neutral-500 leading-tight">231 Edgefield Pl, Strathmore, AB</p>
                </div>
              )}
            </div>
          </div>

          {/* Dismiss button when order is completed or cancelled */}
          {(currentStatus === 'completed' || currentStatus === 'cancelled') && (
            <button
              type="button"
              onClick={onDismiss}
              className="w-full mt-5 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-xs font-black transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/10 animate-fade-in"
            >
              <span>Dismiss & Track New Order</span>
            </button>
          )}

        </div>

        {/* Footer Support Info */}
        <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between text-[10px] text-neutral-500 font-semibold flex-shrink-0">
          <span>Need help with your order?</span>
          <a
            href="tel:5873655401"
            className="flex items-center gap-1 text-brand-primary hover:underline font-bold"
          >
            <Phone size={11} />
            <span>Call Branch</span>
          </a>
        </div>

      </div>
    </div>
  );
}
