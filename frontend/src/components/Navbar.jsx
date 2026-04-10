import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Menu, X, User, LogOut, Bookmark, 
  LayoutDashboard, Moon, Sun, MapPin
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export default function Navbar({ darkMode, setDarkMode }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isHomePage = location.pathname === '/';

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled || !isHomePage
            ? 'navbar-blur bg-white/90 dark:bg-gray-900/90 border-b border-black/5 dark:border-white/5'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="flex items-center"
              >
                <span className={`font-cabinet text-2xl md:text-3xl font-black tracking-tight ${
                  isScrolled || !isHomePage ? 'gradient-text' : 'text-white'
                }`}>
                  CIVIX
                </span>
              </motion.div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <Link 
                to="/services"
                className={`font-medium transition-colors ${
                  isScrolled || !isHomePage 
                    ? 'text-gray-600 hover:text-[#E23744] dark:text-gray-300' 
                    : 'text-white/90 hover:text-white'
                }`}
              >
                Services
              </Link>
              
              {/* Location indicator */}
              <div className={`flex items-center gap-1 text-sm ${
                isScrolled || !isHomePage ? 'text-gray-500 dark:text-gray-400' : 'text-white/80'
              }`}>
                <MapPin className="w-4 h-4" />
                <span>Jamshedpur</span>
              </div>

              {/* Dark mode toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDarkMode(!darkMode)}
                data-testid="dark-mode-toggle"
                className={isScrolled || !isHomePage ? 'text-gray-600 dark:text-gray-300' : 'text-white hover:bg-white/20'}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>

              {/* Auth buttons */}
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      data-testid="user-menu-btn"
                      className={`flex items-center gap-2 ${
                        isScrolled || !isHomePage ? 'text-gray-600 dark:text-gray-300' : 'text-white hover:bg-white/20'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-[#E23744] flex items-center justify-center text-white font-semibold">
                        {user?.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="hidden lg:inline">{user?.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate('/dashboard')} data-testid="dashboard-link">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/bookmarks')} data-testid="bookmarks-link">
                      <Bookmark className="w-4 h-4 mr-2" />
                      Bookmarks
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} data-testid="logout-btn">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/login')}
                    data-testid="login-btn"
                    className={isScrolled || !isHomePage ? 'text-gray-600 dark:text-gray-300' : 'text-white hover:bg-white/20'}
                  >
                    Login
                  </Button>
                  <Button
                    onClick={() => navigate('/register')}
                    data-testid="register-btn"
                    className="bg-[#E23744] hover:bg-[#BE123C] text-white rounded-full px-6"
                  >
                    Sign Up
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
              data-testid="mobile-menu-btn"
            >
              {mobileMenuOpen ? (
                <X className={`w-6 h-6 ${isScrolled || !isHomePage ? 'text-gray-800 dark:text-white' : 'text-white'}`} />
              ) : (
                <Menu className={`w-6 h-6 ${isScrolled || !isHomePage ? 'text-gray-800 dark:text-white' : 'text-white'}`} />
              )}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 md:hidden"
          >
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="absolute right-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-900 shadow-xl"
            >
              <div className="p-6 pt-20">
                <div className="space-y-4">
                  <Link 
                    to="/services"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-3 text-lg font-medium text-gray-800 dark:text-white"
                  >
                    Services
                  </Link>
                  
                  <div className="flex items-center gap-2 py-3 text-gray-500 dark:text-gray-400">
                    <MapPin className="w-5 h-5" />
                    <span>Jamshedpur</span>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <span className="text-gray-600 dark:text-gray-300">Dark Mode</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDarkMode(!darkMode)}
                      className="text-gray-600 dark:text-gray-300"
                    >
                      {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </Button>
                  </div>

                  <hr className="border-gray-200 dark:border-gray-700" />

                  {isAuthenticated ? (
                    <>
                      <div className="flex items-center gap-3 py-3">
                        <div className="w-10 h-10 rounded-full bg-[#E23744] flex items-center justify-center text-white font-semibold">
                          {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">{user?.name}</p>
                          <p className="text-sm text-gray-500">{user?.email}</p>
                        </div>
                      </div>
                      <Link
                        to="/dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 py-3 text-gray-600 dark:text-gray-300"
                      >
                        <LayoutDashboard className="w-5 h-5" />
                        Dashboard
                      </Link>
                      <Link
                        to="/bookmarks"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 py-3 text-gray-600 dark:text-gray-300"
                      >
                        <Bookmark className="w-5 h-5" />
                        Bookmarks
                      </Link>
                      <button
                        onClick={() => {
                          handleLogout();
                          setMobileMenuOpen(false);
                        }}
                        className="flex items-center gap-3 py-3 text-red-600 w-full"
                      >
                        <LogOut className="w-5 h-5" />
                        Logout
                      </button>
                    </>
                  ) : (
                    <div className="space-y-3 pt-4">
                      <Button
                        onClick={() => {
                          navigate('/login');
                          setMobileMenuOpen(false);
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        Login
                      </Button>
                      <Button
                        onClick={() => {
                          navigate('/register');
                          setMobileMenuOpen(false);
                        }}
                        className="w-full bg-[#E23744] hover:bg-[#BE123C] text-white"
                      >
                        Sign Up
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
