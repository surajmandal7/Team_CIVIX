import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Marquee from 'react-fast-marquee';
import { ArrowRight, TrendingUp, Shield, Clock, Star, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SmartSearch from '../components/SmartSearch';
import CategoryCard from '../components/CategoryCard';
import ServiceCard from '../components/ServiceCard';
import SnapToFix from '../components/SnapToFix';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TRENDING_SEARCHES = [
  "Tutor for JEE", "Wedding catering", "AC repair", "Plumber emergency",
  "Electrician", "Home cleaning", "Carpenter", "Salon at home",
  "Biryani delivery", "24/7 Pharmacy", "Gym membership", "Car service"
];

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1920&q=80"
];

const FALLBACK_CATEGORIES = [
  {"id": "plumbing", "name": "Plumbing", "icon": "droplets", "description": "Plumber, Water tank, Pipeline"},
  {"id": "electrical", "name": "Electrical", "icon": "zap", "description": "Electrician, Wiring, Appliance repair"},
  {"id": "cleaning", "name": "Cleaning", "icon": "sparkles", "description": "Home cleaning, Deep cleaning"},
  {"id": "beauty", "name": "Beauty", "icon": "scissors", "description": "Salon, Spa, Grooming"},
  {"id": "ac_repair", "name": "AC Repair", "icon": "fan", "description": "AC service, Installation"},
  {"id": "carpentry", "name": "Carpentry", "icon": "hammer", "description": "Furniture, Woodwork"},
  {"id": "painting", "name": "Painting", "icon": "paintbrush", "description": "Home painting, Wall art"},
  {"id": "pest_control", "name": "Pest Control", "icon": "bug", "description": "Pest removal, Fumigation"},
  {"id": "appliance", "name": "Appliance Repair", "icon": "wrench", "description": "TV, Fridge, Washing machine"},
  {"id": "tutor", "name": "Tutoring", "icon": "graduation-cap", "description": "Home tuition, Coaching"},
  {"id": "catering", "name": "Catering", "icon": "utensils", "description": "Event catering, Tiffin service"},
  {"id": "moving", "name": "Packers & Movers", "icon": "truck", "description": "Relocation, Packing"}
];

export default function Landing() {
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [featuredServices, setFeaturedServices] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSnapToFix, setShowSnapToFix] = useState(false);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
    
    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [catRes, servRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/categories`),
        axios.get(`${API_URL}/api/services?limit=6`),
        axios.get(`${API_URL}/api/stats`)
      ]);
      
      if (catRes.data && catRes.data.length > 0) {
        setCategories(catRes.data);
      }
      setFeaturedServices(servRes.data.services || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Keep using FALLBACK_CATEGORIES on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section - Clean Swiggy/Zomato Style */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* 3D City Background */}
        <div className="absolute inset-0">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentHeroIndex}
              src={HERO_IMAGES[currentHeroIndex]}
              alt="City Background"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="absolute inset-0 w-full h-full object-cover"
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
            />
          </AnimatePresence>
          <div className="absolute inset-0 hero-overlay" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 md:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-cabinet text-4xl sm:text-5xl lg:text-7xl font-black text-white mb-4 tracking-tight">
              Your City, Your Services
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Discover trusted local services in <span className="text-[#F97316] font-semibold">Jamshedpur</span>. 
              From emergency repairs to home care — find what you need, instantly.
            </p>
          </motion.div>

          {/* Smart Search */}
          <SmartSearch onSnapToFix={() => setShowSnapToFix(true)} />

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap justify-center gap-6 mt-10"
          >
            <div className="flex items-center gap-2 text-white/80">
              <Shield className="w-5 h-5 text-green-400" />
              <span>{stats?.verified_services || 50}+ Verified Providers</span>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <Star className="w-5 h-5 text-yellow-400" />
              <span>4.8 Avg Rating</span>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <Clock className="w-5 h-5 text-blue-400" />
              <span>24/7 Emergency Support</span>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-6 h-10 rounded-full border-2 border-white/50 flex justify-center pt-2"
          >
            <div className="w-1 h-2 bg-white/50 rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* Trending Searches Marquee */}
      <section className="py-4 bg-gray-50 dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800">
        <div className="flex items-center">
          <div className="flex items-center gap-2 px-4 md:px-8 text-sm font-medium text-gray-500 dark:text-gray-400">
            <TrendingUp className="w-4 h-4 text-[#E23744]" />
            Trending
          </div>
          <Marquee gradient={false} speed={40} className="overflow-hidden">
            {TRENDING_SEARCHES.map((search, index) => (
              <button
                key={index}
                onClick={() => navigate(`/services?search=${encodeURIComponent(search)}`)}
                className="mx-4 px-4 py-1.5 rounded-full bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:bg-[#E23744] hover:text-white transition-colors border border-gray-200 dark:border-gray-700"
              >
                {search}
              </button>
            ))}
          </Marquee>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12 md:py-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="font-cabinet text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-3">
              Browse by Category
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Find the right service for your needs
            </p>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(12)].map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {categories.slice(0, 12).map((category, index) => (
                <CategoryCard key={category.id} category={category} index={index} />
              ))}
            </div>
          )}

          {categories.length > 12 && (
            <div className="text-center mt-8">
              <Button
                variant="outline"
                onClick={() => navigate('/services')}
                className="rounded-full"
              >
                View All {categories.length} Categories
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Snap to Fix Feature */}
      <section className="py-12 md:py-20 px-4 md:px-8 bg-gradient-to-br from-[#E23744]/5 to-[#F97316]/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="inline-block px-4 py-1 rounded-full bg-[#E23744]/10 text-[#E23744] text-sm font-medium mb-4">
                AI-Powered
              </span>
              <h2 className="font-cabinet text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-4">
                Snap to Fix
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
                Don't know what's wrong? Just take a photo! Our AI will analyze the issue, 
                identify the problem, and connect you with the right service provider.
              </p>
              <ul className="space-y-3 mb-6">
                {['Instant issue detection', 'Cost estimation', 'Smart recommendations'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => setShowSnapToFix(true)}
                className="bg-[#E23744] hover:bg-[#BE123C] text-white rounded-full px-8"
                data-testid="snap-to-fix-cta"
              >
                Try Snap to Fix
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <img
                src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80"
                alt="Snap to Fix"
                className="w-full max-w-md mx-auto rounded-2xl shadow-xl"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                loading="lazy"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Services Section */}
      <section className="py-12 md:py-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-between mb-10"
          >
            <div>
              <h2 className="font-cabinet text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-2">
                Featured Services
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Top-rated providers in Jamshedpur
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/services')}
              className="hidden md:flex rounded-full"
              data-testid="view-all-services"
            >
              View All
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredServices.map((service, index) => (
                <ServiceCard key={service.id} service={service} index={index} />
              ))}
            </div>
          )}

          <div className="mt-8 text-center md:hidden">
            <Button
              onClick={() => navigate('/services')}
              className="bg-[#E23744] hover:bg-[#BE123C] text-white rounded-full"
            >
              View All Services
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-12 md:py-20 px-4 md:px-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Shield className="w-16 h-16 mx-auto mb-6 text-green-500" />
            <h2 className="font-cabinet text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-4">
              AI-Powered Trust Scores
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8 text-lg">
              Our advanced AI analyzes reviews, service history, and response patterns to give you 
              an authentic trust score. No fake reviews, no manipulation — just genuine feedback.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="px-6 py-3 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
                Fake Review Detection
              </div>
              <div className="px-6 py-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
                Verified Businesses
              </div>
              <div className="px-6 py-3 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-medium">
                Real-time Updates
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-20 px-4 md:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-[#E23744] to-[#F97316] rounded-3xl p-8 md:p-12 text-white"
          >
            <h2 className="font-cabinet text-3xl md:text-4xl font-bold mb-4">
              Ready to find your service?
            </h2>
            <p className="text-white/80 mb-8 text-lg">
              Join thousands of Jamshedpur residents who trust CIVIX for their daily service needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate('/services')}
                className="bg-white text-[#E23744] hover:bg-gray-100 rounded-full px-8 py-6 text-lg font-semibold"
                data-testid="explore-services-cta"
              >
                Explore Services
              </Button>
              <Button
                onClick={() => navigate('/register')}
                variant="outline"
                className="border-white text-white hover:bg-white/10 rounded-full px-8 py-6 text-lg font-semibold"
                data-testid="join-cta"
              >
                Join as Provider
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Snap to Fix Modal */}
      <SnapToFix isOpen={showSnapToFix} onClose={() => setShowSnapToFix(false)} />
    </div>
  );
}
