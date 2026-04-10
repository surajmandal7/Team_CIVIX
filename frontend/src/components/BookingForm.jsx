import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, User, Phone, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { toast } from 'sonner';

export default function BookingForm({ service, user, isOpen, onClose, onConfirm }) {
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [address, setAddress] = useState(user?.address || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!bookingDate || !bookingTime || !phone || !address) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call for booking
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsSuccess(true);
      onConfirm && onConfirm({
        serviceId: service.id,
        date: bookingDate,
        time: bookingTime,
        address,
        phone,
        notes
      });
    } catch (error) {
      toast.error('Failed to process booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSuccess) {
      setIsSuccess(false);
      // Reset form
      setBookingDate('');
      setBookingTime('');
      setNotes('');
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none bg-white dark:bg-gray-900 shadow-2xl">
        {!isSuccess ? (
          <form onSubmit={handleSubmit}>
            <DialogHeader className="p-6 pb-2">
              <DialogTitle className="font-cabinet text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CalendarIcon className="w-6 h-6 text-[#E23744]" />
                Book Service
              </DialogTitle>
              <DialogDescription className="text-gray-500 dark:text-gray-400">
                Secure your slot with <strong>{service.name}</strong>. The provider will contact you to confirm.
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Service Info Mini Card */}
              <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center gap-3 border border-gray-100 dark:border-gray-700">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                  <img 
                    src={service.images?.[0] || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=100'} 
                    alt={service.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{service.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{service.price_range}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Preferred Date *</Label>
                  <div className="relative group">
                    <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#E23744]" />
                    <Input
                      id="date"
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="pl-10 h-11 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[#E23744]"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time" className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Preferred Time *</Label>
                  <div className="relative group">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#E23744]" />
                    <Input
                      id="time"
                      type="time"
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      className="pl-10 h-11 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[#E23744]"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Contact Number *</Label>
                <div className="relative group">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#E23744]" />
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="pl-10 h-11 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[#E23744]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Service Address *</Label>
                <div className="relative group">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400 group-focus-within:text-[#E23744]" />
                  <Textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter your full address in Jamshedpur..."
                    className="pl-10 min-h-[80px] rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[#E23744] resize-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Special Instructions (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any specific details or requests..."
                  className="rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[#E23744] resize-none"
                />
              </div>
            </div>

            <DialogFooter className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex flex-row gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                className="flex-1 h-12 rounded-2xl font-bold"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-[2] h-12 bg-gradient-to-r from-[#E23744] to-[#F97316] hover:from-[#BE123C] hover:to-[#EA580C] text-white rounded-2xl font-bold shadow-lg shadow-red-500/20 transform active:scale-[0.98] transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Booking...
                  </>
                ) : (
                  'Confirm Booking'
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="p-10 text-center space-y-6">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white font-cabinet">Booking Request Sent!</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Your request for <strong>{service.name}</strong> has been received. 
                The provider will call you on <strong>{phone}</strong> shortly.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 text-left space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-400">
                <AlertCircle className="w-4 h-4" />
                Next Steps
              </div>
              <ul className="text-xs text-blue-600/80 dark:text-blue-400/80 space-y-1 list-disc pl-4">
                <li>Wait for a confirmation call (usually within 30 mins)</li>
                <li>Verify the provider's ID card when they arrive</li>
                <li>Pay only after the service is completed</li>
              </ul>
            </div>
            <Button 
              onClick={handleClose}
              className="w-full h-12 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
            >
              Back to Service
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
