import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Bookmark, Star, Eye, TrendingUp, Clock, 
  ChevronRight, User, Settings, Calendar, MapPin, Phone, CheckCircle2
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import ServiceCard from '../components/ServiceCard';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Dashboard() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [recentServices, setRecentServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to finish loading before checking
    if (authLoading) return;
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchDashboardData();
  }, [isAuthenticated, authLoading, navigate]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('civix_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, bookmarksRes, servicesRes, bookingsRes] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/stats`, { headers }),
        axios.get(`${API_URL}/api/bookmarks`, { headers }),
        axios.get(`${API_URL}/api/services?limit=6`),
        axios.get(`${API_URL}/api/bookings/my`, { headers }).catch(() => ({ data: [] }))
      ]);

      setStats(statsRes.data);
      setBookmarks(bookmarksRes.data || []);
      setBookings(bookingsRes.data || []);
      
      // Mark bookmarked status in recent services
      const bookmarkedIds = new Set((bookmarksRes.data || []).map(b => b.id));
      const recent = (servicesRes.data.services || []).map(s => ({
        ...s,
        is_bookmarked: bookmarkedIds.has(s.id)
      }));
      setRecentServices(recent);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBookmark = async (serviceId) => {
    const isCurrentlyBookmarked = bookmarks.some(b => b.id === serviceId) || 
                                 recentServices.find(s => s.id === serviceId)?.is_bookmarked;
    
    try {
      const token = localStorage.getItem('civix_token');
      if (isCurrentlyBookmarked) {
        await axios.delete(`${API_URL}/api/bookmarks/${serviceId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBookmarks(bookmarks.filter(b => b.id !== serviceId));
        setRecentServices(recentServices.map(s => 
          s.id === serviceId ? { ...s, is_bookmarked: false } : s
        ));
        toast.success('Removed from bookmarks');
      } else {
        await axios.post(`${API_URL}/api/bookmarks`, 
          { service_id: serviceId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        // Find the service in recentServices to add to bookmarks
        const serviceToAdd = recentServices.find(s => s.id === serviceId);
        if (serviceToAdd) {
          setBookmarks([...bookmarks, { ...serviceToAdd, is_bookmarked: true }]);
        }
        
        setRecentServices(recentServices.map(s => 
          s.id === serviceId ? { ...s, is_bookmarked: true } : s
        ));
        toast.success('Added to bookmarks');
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast.error('Failed to update bookmark');
    }
  };

  const removeBookmark = async (serviceId) => {
    try {
      const token = localStorage.getItem('civix_token');
      await axios.delete(`${API_URL}/api/bookmarks/${serviceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookmarks(bookmarks.filter(b => b.id !== serviceId));
      setRecentServices(recentServices.map(s => 
        s.id === serviceId ? { ...s, is_bookmarked: false } : s
      ));
      toast.success('Removed from bookmarks');
    } catch (error) {
      console.error('Error removing bookmark:', error);
      toast.error('Failed to remove bookmark');
    }
  };

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen pt-20 pb-12 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#E23744] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen pt-20 pb-12 bg-gray-50 dark:bg-gray-900" data-testid="patient-dashboard">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-cabinet text-3xl md:text-4xl font-bold text-gray-800 dark:text-white"
            >
              Welcome back, {user?.name?.split(' ')[0]}!
            </motion.h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Here's what's happening with your services
            </p>
          </div>
          <Button
            variant="outline"
            className="rounded-full"
            data-testid="profile-settings-btn"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Bookmark className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Saved Services</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-3xl font-bold text-gray-800 dark:text-white">
                {stats?.bookmarks_count || 0}
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Reviews Given</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-3xl font-bold text-gray-800 dark:text-white">
                {stats?.reviews_count || 0}
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Member Since</p>
            <p className="text-lg font-bold text-gray-800 dark:text-white">
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </motion.div>
        </div>

        {/* My Bookings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-cabinet text-2xl font-bold text-gray-800 dark:text-white">
              My Bookings
            </h2>
            {bookings.length > 0 && (
              <Button
                variant="ghost"
                onClick={() => navigate('/bookings')}
                className="text-[#E23744]"
              >
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-3xl" />
              ))}
            </div>
          ) : bookings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {bookings.slice(0, 4).map((booking, index) => (
                <div 
                  key={booking.id || index}
                  className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4"
                >
                  <div className="w-full sm:w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
                    <img 
                      src={booking.service_image || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200'} 
                      alt={booking.service_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-900 dark:text-white">{booking.service_name}</h3>
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        booking.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {booking.status || 'Confirmed'}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#E23744]" />
                        <span>{booking.date || 'Today'} at {booking.time || '2:00 PM'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#E23744]" />
                        <span className="line-clamp-1">{booking.address || 'Bistupur, Jamshedpur'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 dark:text-gray-400">You haven't booked any services yet.</p>
              <Button
                variant="link"
                onClick={() => navigate('/services')}
                className="text-[#E23744] font-bold mt-2"
              >
                Book your first service
              </Button>
            </div>
          )}
        </motion.div>

        {/* Saved Services */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-cabinet text-2xl font-bold text-gray-800 dark:text-white">
              Your Saved Services
            </h2>
            <Button
              variant="ghost"
              onClick={() => navigate('/bookmarks')}
              className="text-[#E23744]"
              data-testid="view-all-bookmarks"
            >
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-2xl" />
              ))}
            </div>
          ) : bookmarks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bookmarks.slice(0, 3).map((service, index) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  index={index}
                  isBookmarked={true}
                  onBookmark={() => removeBookmark(service.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
              <Bookmark className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                No saved services yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Browse services and save your favorites for quick access
              </p>
              <Button
                onClick={() => navigate('/services')}
                className="bg-[#E23744] hover:bg-[#BE123C] text-white rounded-full"
              >
                Explore Services
              </Button>
            </div>
          )}
        </motion.div>

        {/* Recommended Services */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-cabinet text-2xl font-bold text-gray-800 dark:text-white">
              Recommended for You
            </h2>
            <Button
              variant="ghost"
              onClick={() => navigate('/services')}
              className="text-[#E23744]"
            >
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentServices.slice(0, 3).map((service, index) => (
                <ServiceCard 
                  key={service.id} 
                  service={service} 
                  index={index} 
                  isBookmarked={service.is_bookmarked}
                  onBookmark={toggleBookmark}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
