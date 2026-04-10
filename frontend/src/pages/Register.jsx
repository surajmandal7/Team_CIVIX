import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, User, Phone, Loader2, Building2, Briefcase, MapPin, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();
  
  // Detect role from URL query param
  const queryParams = new URLSearchParams(location.search);
  const initialRole = queryParams.get('role') === 'business' ? 'business' : 'user';

  const [role, setRole] = useState(initialRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Business specific fields
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    const businessData = role === 'business' ? {
      business_name: businessName,
      category: category,
      address: address
    } : null;

    const result = await register(name, email, password, phone, role, businessData);
    
    setIsLoading(false);
    
    if (result.success) {
      // Role-based redirection
      if (result.role === 'business') {
        navigate('/business/dashboard');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.error);
    }
  };

  const categories = [
    "Plumbing", "Electrical", "Cleaning", "AC Repair", "Carpentry", 
    "Painting", "Pest Control", "Appliance", "Tutor", "Catering", 
    "Moving", "Restaurant", "Cafe", "Grocery", "Medical", "Gym", 
    "Salon", "Laundry", "Repair", "Auto", "Travel"
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-20 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-[#E23744]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 -right-4 w-72 h-72 bg-[#F97316]/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-xl relative z-10"
      >
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-8 md:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <Link to="/" className="inline-block mb-6 group">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E23744] to-[#F97316] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-cabinet text-3xl font-black tracking-tighter text-gray-900 dark:text-white">
                    CIVIX
                  </span>
                </div>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {role === 'business' ? 'Partner with CIVIX' : 'Create an account'}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                {role === 'business' 
                  ? 'Join the network of top service providers in Jamshedpur' 
                  : 'Discover and book local services in just a few clicks'}
              </p>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6"
                >
                  <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-900/30">
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
                    {role === 'business' ? 'Owner Name' : 'Full Name'}
                  </Label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#E23744] transition-colors" />
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="pl-12 h-12 rounded-2xl bg-gray-50/50 dark:bg-gray-800/50"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
                    Email Address
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#E23744] transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="pl-12 h-12 rounded-2xl bg-gray-50/50 dark:bg-gray-800/50"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
                    Phone Number
                  </Label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#E23744] transition-colors" />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="pl-12 h-12 rounded-2xl bg-gray-50/50 dark:bg-gray-800/50"
                      required
                    />
                  </div>
                </div>

                {/* Business Specific Fields */}
                {role === 'business' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="businessName" className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
                        Business Name
                      </Label>
                      <div className="relative group">
                        <Building2 className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#E23744] transition-colors" />
                        <Input
                          id="businessName"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder="Acme Services"
                          className="pl-12 h-12 rounded-2xl bg-gray-50/50 dark:bg-gray-800/50"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
                        Service Category
                      </Label>
                      <div className="relative group">
                        <Briefcase className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#E23744] transition-colors" />
                        <select
                          id="category"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full pl-12 h-12 rounded-2xl bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[#E23744] focus:border-transparent outline-none appearance-none"
                          required
                        >
                          <option value="">Select Category</option>
                          {categories.map(cat => (
                            <option key={cat} value={cat.toLowerCase().replace(' ', '_')}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address" className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
                        Business Address
                      </Label>
                      <div className="relative group">
                        <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#E23744] transition-colors" />
                        <Input
                          id="address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Bistupur Market, Jamshedpur"
                          className="pl-12 h-12 rounded-2xl bg-gray-50/50 dark:bg-gray-800/50"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Password Fields */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
                    Password
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#E23744] transition-colors" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-12 pr-12 h-12 rounded-2xl bg-gray-50/50 dark:bg-gray-800/50"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
                    Confirm Password
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#E23744] transition-colors" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-12 h-12 rounded-2xl bg-gray-50/50 dark:bg-gray-800/50"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-1">
                <input 
                  type="checkbox" 
                  id="terms" 
                  className="w-4 h-4 rounded border-gray-300 text-[#E23744] focus:ring-[#E23744]" 
                  required
                />
                <label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                  I agree to the <Link to="/terms" className="text-[#E23744] font-bold">Terms</Link> and <Link to="/privacy" className="text-[#E23744] font-bold">Privacy Policy</Link>
                </label>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-gradient-to-r from-[#E23744] to-[#F97316] hover:from-[#BE123C] hover:to-[#EA580C] text-white rounded-2xl font-bold text-lg shadow-xl shadow-red-500/20 transform active:scale-[0.98] transition-all"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Creating Account...</span>
                  </div>
                ) : (
                  role === 'business' ? 'Register Business' : 'Create Account'
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Already have an account?{' '}
                <Link to="/login" className="text-[#E23744] font-bold hover:underline">
                  Sign In
                </Link>
              </p>
              
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => setRole(role === 'business' ? 'user' : 'business')}
                  className="text-xs uppercase tracking-widest font-black text-gray-400 hover:text-[#E23744] transition-colors"
                >
                  {role === 'business' ? 'Switch to User Registration' : 'Register as a Business Provider'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
