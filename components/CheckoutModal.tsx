'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, User, Phone, Mail, MapPin, Clock, CreditCard, ArrowRight, AlertCircle, ShoppingBag, Locate, Truck } from 'lucide-react';
import { CartItem } from '../types';
import toast from 'react-hot-toast';
import axios from 'axios';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  orderType: 'takeout' | 'delivery';
  setOrderType: (type: 'takeout' | 'delivery') => void;
  address: string;
  setAddress: (address: string) => void;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  onSubmit: (orderData: any) => void;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  cartItems,
  orderType,
  setOrderType,
  address,
  setAddress,
  subtotal,
  tax,
  deliveryFee,
  total,
  onSubmit,
}: CheckoutModalProps) {
  // Customer details
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [addressInput, setAddressInput] = useState(address);
  const [notes, setNotes] = useState('');

  // Timing states
  const [timingMode, setTimingMode] = useState<'now' | 'later'>('now');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');

  // GPS locating state
  const [isLocating, setIsLocating] = useState(false);

  // Form validity validator
  const isFormInvalid = useMemo(() => {
    if (!name.trim()) return true;
    if (!phone.trim() || phone.trim().replace(/\D/g, '').length < 10) return true;
    if (orderType === 'delivery' && !addressInput.trim()) return true;
    if (timingMode === 'later' && !selectedTimeSlot) return true;
    return false;
  }, [name, phone, orderType, addressInput, timingMode, selectedTimeSlot]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    toast.loading('Fetching your location...', { id: 'locating' });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // OpenStreetMap Nominatim reverse geocoding API
          const response = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'en-US,en;q=0.9',
              },
            }
          );
          
          if (response.data && response.data.display_name) {
            const fullAddress = response.data.display_name;
            setAddressInput(fullAddress);
            toast.success('Location updated!', { id: 'locating' });
          } else {
            setAddressInput(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            toast.success('Coordinates captured!', { id: 'locating' });
          }
        } catch (error) {
          console.error('Error reverse geocoding location:', error);
          setAddressInput(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          toast.success('Coordinates captured (Reverse geocoding failed)!', { id: 'locating' });
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error('Error getting geolocation:', error);
        let errorMsg = 'Failed to get your location';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location permission denied. Please allow location access in your browser settings.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Location position unavailable.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Location request timed out.';
        }
        toast.error(errorMsg, { id: 'locating' });
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Sync addressInput with context address
  useEffect(() => {
    setAddressInput(address);
  }, [address]);

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

  // Generate 15-minute time slots between 11:00 AM and 10:00 PM for the current day
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    const now = new Date();
    
    // Start generating slots 30 minutes from now
    const startTime = new Date(now.getTime() + 30 * 60 * 1000);
    
    // Round minutes up to the next 15-minute boundary (e.g. :00, :15, :30, :45)
    const minutes = startTime.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 15) * 15;
    if (roundedMinutes === 60) {
      startTime.setHours(startTime.getHours() + 1);
      startTime.setMinutes(0);
    } else {
      startTime.setMinutes(roundedMinutes);
    }
    startTime.setSeconds(0, 0);

    // Clamp start hour to operational hours
    if (startTime.getHours() < 11) {
      startTime.setHours(11, 0, 0, 0);
    }
    
    const endTime = new Date();
    endTime.setHours(22, 0, 0, 0); // 10:00 PM close

    while (startTime < endTime) {
      const hours = startTime.getHours();
      const currentMins = startTime.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
      const formattedMinutes = currentMins < 10 ? `0${currentMins}` : currentMins;
      
      const timeStr = `${formattedHours}:${formattedMinutes} ${ampm}`;
      slots.push(timeStr);
      
      // Add 15 minutes
      startTime.setMinutes(startTime.getMinutes() + 15);
    }
    
    return slots;
  }, [isOpen]);

  // Select first slot by default when timeSlots change
  useEffect(() => {
    if (timeSlots.length > 0 && !selectedTimeSlot) {
      setSelectedTimeSlot(timeSlots[0]);
    }
  }, [timeSlots, selectedTimeSlot]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return toast.error('Please enter your name');
    if (!phone.trim() || phone.length < 10) return toast.error('Please enter a valid phone number');
    if (orderType === 'delivery' && !addressInput.trim()) return toast.error('Please enter a delivery address');

    // Parse scheduled date if timingMode is 'later'
    let scheduledAt: Date | null = null;
    let dueAt: Date | null = null;

    if (timingMode === 'later' && selectedTimeSlot) {
      const [time, modifier] = selectedTimeSlot.split(' ');
      let [hoursStr, minutesStr] = time.split(':');
      let hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;

      const targetDate = new Date();
      targetDate.setHours(hours, minutes, 0, 0);
      scheduledAt = targetDate;
      dueAt = targetDate;
    } else {
      // ASAP order: due time is current time + prep estimation
      // Let's set default due date to 30 mins from now
      const targetDate = new Date();
      targetDate.setMinutes(targetDate.getMinutes() + 30);
      dueAt = targetDate;
    }

    // Save address back to context if it was updated
    if (orderType === 'delivery' && addressInput !== address) {
      setAddress(addressInput);
    }

    // Construct the Mongoose Order Payload
    const orderPayload = {
      orderType: orderType, // backend will need this, e.g. "takeout" or "delivery"
      orderSource: 'online',
      items: cartItems.map(item => ({
        menuItemId: item.menuItemId,
        name: item.name,
        image: item.image || '',
        basePrice: item.basePrice,
        selectedModifiers: item.selectedModifiers,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        note: item.note || '',
      })),
      subtotal: subtotal,
      tax: tax,
      taxRate: 0.05,
      deliveryFee: orderType === 'delivery' ? deliveryFee : 0,
      total: total,
      paymentTiming: 'pay-now', // Default to pay-now since online checkout
      paymentType: 'one-time',
      paymentStatus: 'unpaid', // Initial online order starts as unpaid or paid depending on payment system
      payments: [
        {
          method: paymentMethod,
          amount: total,
        }
      ],
      orderTiming: timingMode,
      scheduledAt: scheduledAt,
      dueAt: dueAt,
      customer: {
        name: name,
        phone: phone,
        email: email || '',
        address: orderType === 'delivery' ? addressInput : '',
      },
      notes: notes,
      status: 'pending',
    };

    onSubmit(orderPayload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:justify-end select-none">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />

      {/* Slide-over Container */}
      <div className="relative w-full md:max-w-[34rem] h-[92vh] md:h-full bg-white rounded-t-3xl md:rounded-t-none md:rounded-l-2xl overflow-hidden shadow-2xl flex flex-col z-10 animate-slide-up-mobile md:animate-drawer-slide-in">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
              <ShoppingBag size={15} className="text-brand-primary" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest leading-none">Checkout</p>
              <h3 className="text-xs font-black text-neutral-900 leading-tight mt-1">Complete Your Order</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 hover:bg-neutral-200 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable Form Area */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-5 min-h-0 no-scrollbar pb-24">
          
          {/* Order Mode Toggle */}
          <div className="space-y-2">
            <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Order Option</label>
            <div className="grid grid-cols-2 gap-2 bg-neutral-100 p-1 rounded-xl border border-neutral-200/50">
              <button
                type="button"
                onClick={() => setOrderType('takeout')}
                className={`py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  orderType === 'takeout'
                    ? 'bg-white text-neutral-800 shadow-sm border border-neutral-200/20'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <ShoppingBag size={13} className={orderType === 'takeout' ? 'text-brand-primary' : 'text-neutral-400'} />
                <span>Takeout</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderType('delivery')}
                className={`py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  orderType === 'delivery'
                    ? 'bg-white text-neutral-800 shadow-sm border border-neutral-200/20'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <Truck size={13} className={orderType === 'delivery' ? 'text-brand-primary' : 'text-neutral-400'} />
                <span>Delivery</span>
              </button>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 pb-1">
              Contact Information
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Name */}
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wide">Full Name *</label>
                <div className="relative">
                  <User size={13} className="absolute left-3 top-3 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-white border border-neutral-200 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-700 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wide">Phone Number *</label>
                <div className="relative">
                  <Phone size={13} className="absolute left-3 top-3 text-neutral-400" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 555-5555"
                    className="w-full bg-white border border-neutral-200 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-700 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              </div>
            </div>

            {/* Email (Optional) */}
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wide">Email (Optional)</label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-3 text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-white border border-neutral-200 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-700 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                />
              </div>
            </div>
          </div>

          {/* Delivery Address (Conditional) */}
          {orderType === 'delivery' && (
            <div className="space-y-3 animate-fade-in">
              <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 pb-1">
                Delivery Destination
              </h4>
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wide">Delivery Address *</label>
                <div className="relative flex items-center">
                  <MapPin size={13} className="absolute left-3 text-brand-primary" />
                  <input
                    type="text"
                    required
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    placeholder="Enter apartment, street address, Strathmore, AB"
                    className="w-full bg-white border border-neutral-200 rounded-xl pl-9 pr-10 py-2.5 text-xs text-neutral-700 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                  />
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={isLocating}
                    title="Use GPS current location"
                    className="absolute right-3 p-1.5 text-neutral-400 hover:text-brand-primary disabled:text-neutral-300 transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <Locate size={14} className={isLocating ? 'animate-spin text-brand-primary' : ''} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Timing & Scheduling */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 pb-1">
              Timing Preferences
            </h4>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTimingMode('now')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  timingMode === 'now'
                    ? 'border-brand-primary bg-orange-50/20 ring-1 ring-brand-primary'
                    : 'border-neutral-200 bg-white hover:bg-neutral-50'
                }`}
              >
                <Clock size={15} className={timingMode === 'now' ? 'text-brand-primary' : 'text-neutral-400'} />
                <span className="text-[10.5px] font-bold mt-1 text-neutral-800">ASAP</span>
                <span className="text-[8.5px] text-neutral-400 mt-0.5">
                  {orderType === 'delivery' ? 'Prep + 1h Delivery' : 'Ready in 15-20m'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTimingMode('later')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  timingMode === 'later'
                    ? 'border-brand-primary bg-orange-50/20 ring-1 ring-brand-primary'
                    : 'border-neutral-200 bg-white hover:bg-neutral-50'
                }`}
              >
                <Clock size={15} className={timingMode === 'later' ? 'text-brand-primary' : 'text-neutral-400'} />
                <span className="text-[10.5px] font-bold mt-1 text-neutral-800">Schedule Later</span>
                <span className="text-[8.5px] text-neutral-400 mt-0.5">Select time slot</span>
              </button>
            </div>

            {/* Time slot dropdown if scheduling for later */}
            {timingMode === 'later' && (
              <div className="space-y-1.5 animate-scale-up">
                <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wide">Select Time Slot *</label>
                {timeSlots.length > 0 ? (
                  <select
                    value={selectedTimeSlot}
                    onChange={(e) => setSelectedTimeSlot(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 font-bold focus:outline-none focus:border-brand-primary cursor-pointer"
                  >
                    {timeSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-1.5 p-3 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 text-[10px] font-semibold">
                    <AlertCircle size={12} />
                    <span>The kitchen is closed or closing soon. Slots are not available.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 pb-1">
              Payment Option
            </h4>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'border-brand-primary bg-orange-50/20 ring-1 ring-brand-primary'
                    : 'border-neutral-200 bg-white hover:bg-neutral-50'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${paymentMethod === 'cash' ? 'bg-brand-primary border-brand-primary' : 'border-neutral-300'}`}>
                  {paymentMethod === 'cash' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-neutral-800">Cash</p>
                  <p className="text-[8px] text-neutral-400">Pay on delivery/pickup</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentMethod === 'card'
                    ? 'border-brand-primary bg-orange-50/20 ring-1 ring-brand-primary'
                    : 'border-neutral-200 bg-white hover:bg-neutral-50'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${paymentMethod === 'card' ? 'bg-brand-primary border-brand-primary' : 'border-neutral-300'}`}>
                  {paymentMethod === 'card' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-neutral-800">Card Terminal</p>
                  <p className="text-[8px] text-neutral-400">Tap card at counter/door</p>
                </div>
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
              {orderType === 'delivery' ? 'Delivery Instructions (Optional)' : 'Special Prep Notes (Optional)'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={orderType === 'delivery' ? 'E.g., Leave at the door, call when arrived...' : 'E.g., Extra napkins, plastic utensils...'}
              rows={2}
              className="w-full bg-white border border-neutral-200 rounded-xl p-2 text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary resize-none"
            />
          </div>

          {/* Pricing Totals box */}
          <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200/50 space-y-2">
            <div className="flex justify-between text-[10px] text-neutral-500 font-semibold">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {orderType === 'delivery' && (
              <div className="flex justify-between text-[10px] text-neutral-500 font-semibold">
                <span>Delivery Fee</span>
                <span>${deliveryFee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-[10px] text-neutral-500 font-semibold">
              <span>GST (5%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-black text-neutral-800 border-t border-neutral-200/70 pt-2">
              <span>Total Amount</span>
              <span className="text-sm text-brand-primary">${total.toFixed(2)}</span>
            </div>
          </div>

        </form>

        {/* Footer Fixed Placed Order Action */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-100 bg-white flex items-center justify-between gap-4 z-20">
          <div className="min-w-0">
            <p className="text-[8px] text-neutral-400 font-extrabold uppercase tracking-wide">Total Order Price</p>
            <p className="text-[14px] font-black text-neutral-800">${total.toFixed(2)}</p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isFormInvalid}
            className={`flex-1 py-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              isFormInvalid
                ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
                : 'bg-brand-primary hover:bg-brand-primary-hover text-white shadow-lg shadow-brand-primary/10 active:scale-[0.98] cursor-pointer'
            }`}
          >
            <span>Place {orderType === 'delivery' ? 'Delivery' : 'Pickup'} Order</span>
            <ArrowRight size={13} strokeWidth={2.5} />
          </button>
        </div>

      </div>
    </div>
  );
}
