import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Bookmark, Star, Eye, TrendingUp, Clock, 
  ChevronRight, User, Settings
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import ServiceCard from '../components/ServiceCard';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [recentServices, setRecentServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchDashboardData();
  }, [isAuthenticated, navigate]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('civix_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, bookmarksRes, servicesRes] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/stats`, { headers }),
        axios.get(`${API_URL}/api/bookmarks`, { headers }),
        axios.get(`${API_URL}/api/services?limit=6`)
      ]);

      setStats(statsRes.data);
      setBookmarks(bookmarksRes.data || []);
      setRecentServices(servicesRes.data.services || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeBookmark = async (serviceId) => {
    try {
      const token = localStorage.getItem('civix_token');
      await axios.delete(`${API_URL}/api/bookmarks/${serviceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookmarks(bookmarks.filter(b => b.id !== serviceId));
    } catch (error) {
      console.error('Error removing bookmark:', error);
    }
  };

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
                <ServiceCard key={service.id} service={service} index={index} />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
