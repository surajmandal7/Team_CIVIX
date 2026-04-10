import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Trash2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import ServiceCard from '../components/ServiceCard';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Bookmarks() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchBookmarks();
  }, [isAuthenticated, navigate]);

  const fetchBookmarks = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('civix_token');
      const response = await axios.get(`${API_URL}/api/bookmarks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookmarks(response.data || []);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
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
      toast.success('Removed from bookmarks');
    } catch (error) {
      toast.error('Failed to remove bookmark');
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen pt-20 pb-12 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="py-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-cabinet text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-2"
          >
            Your Bookmarks
          </motion.h1>
          <p className="text-gray-500 dark:text-gray-400">
            {bookmarks.length} saved services
          </p>
        </div>

        {/* Bookmarks Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : bookmarks.length > 0 ? (
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {bookmarks.map((service, index) => (
              <ServiceCard
                key={service.id}
                service={service}
                index={index}
                isBookmarked={true}
                onBookmark={() => removeBookmark(service.id)}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Bookmark className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              No bookmarks yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Save your favorite services for quick access
            </p>
            <Button 
              onClick={() => navigate('/services')} 
              className="bg-[#E23744] hover:bg-[#BE123C] text-white rounded-full"
            >
              Explore Services
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
