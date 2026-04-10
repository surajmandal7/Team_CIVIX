import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Loader2, User, Building2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';

export default function Login() {
  const [activeTab, setActiveTab] = useState('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password, activeTab);
    
    setIsLoading(false);
    
    if (result.success) {
      if (from) {
        navigate(from, { replace: true });
      } else {
        // Role-based redirection
        switch (result.role) {
          case 'admin':
            navigate('/admin/dashboard');
            break;
          case 'business':
            navigate('/business/dashboard');
            break;
          default:
            navigate('/dashboard');
        }
      }
    } else {
      setError(result.error);
    }
  };

  const roles = [
    { id: 'user', label: 'User', icon: User, description: 'Find and book services' },
    { id: 'business', label: 'Business', icon: Building2, description: 'Manage your services' },
    { id: 'admin', label: 'Admin', icon: ShieldCheck, description: 'Platform management' }
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
        className="w-full max-w-lg relative z-10"
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
                Welcome back
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Sign in to your account to continue
              </p>
            </div>

            {/* Role Selection Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
              <TabsList className="grid grid-cols-3 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl h-14">
                {roles.map((role) => (
                  <TabsTrigger 
                    key={role.id} 
                    value={role.id}
                    className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm transition-all"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <role.icon className="w-4 h-4" />
                      <span className="text-[10px] uppercase font-bold tracking-wider">{role.label}</span>
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="mt-4 text-center"
                >
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    {roles.find(r => r.id === activeTab)?.description}
                  </p>
                </motion.div>
              </AnimatePresence>
            </Tabs>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6"
                >
                  <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2 border border-red-100 dark:border-red-900/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
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
                    placeholder="name@company.com"
                    className="pl-12 h-14 rounded-2xl border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[#E23744] focus:border-transparent transition-all bg-gray-50/50 dark:bg-gray-800/50"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Password
                  </Label>
                  <Link to="/forgot-password" size="sm" className="text-xs text-[#E23744] hover:text-[#BE123C] font-bold">
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#E23744] transition-colors" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-12 pr-12 h-14 rounded-2xl border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[#E23744] focus:border-transparent transition-all bg-gray-50/50 dark:bg-gray-800/50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-1">
                <input 
                  type="checkbox" 
                  id="remember" 
                  className="w-4 h-4 rounded border-gray-300 text-[#E23744] focus:ring-[#E23744] dark:bg-gray-800 dark:border-gray-700" 
                />
                <label htmlFor="remember" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                  Keep me logged in
                </label>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-gradient-to-r from-[#E23744] to-[#F97316] hover:from-[#BE123C] hover:to-[#EA580C] text-white rounded-2xl font-bold text-lg shadow-xl shadow-red-500/20 hover:shadow-red-500/40 transform active:scale-[0.98] transition-all"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  `Sign In as ${roles.find(r => r.id === activeTab)?.label}`
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-10 text-center space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100 dark:border-gray-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-widest">
                  <span className="px-4 bg-white dark:bg-gray-900 text-gray-400 font-medium">
                    New to the platform?
                  </span>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/register"
                  className="text-gray-600 dark:text-gray-400 text-sm hover:text-[#E23744] transition-colors"
                >
                  Create User Account
                </Link>
                <div className="hidden sm:block w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                <Link
                  to="/register?role=business"
                  className="text-gray-600 dark:text-gray-400 text-sm hover:text-[#E23744] transition-colors"
                >
                  Join as a Partner
                </Link>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
