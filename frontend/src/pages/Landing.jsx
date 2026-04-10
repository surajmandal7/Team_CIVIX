import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Marquee from 'react-fast-marquee';
import { 
  ArrowRight, TrendingUp, Shield, Clock, Star, MapPin, 
  Zap, Sparkles, Users, Building2, Phone, ChevronRight
} from 'lucide-react';
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
  "AC repair", "Plumber emergency", "Electrician", "Home cleaning", 
  "Carpenter", "Salon at home", "Pest control", "Appliance repair",
  "Biryani delivery", "Chai cafe", "24/7 Pharmacy", "Gym membership"
];

export default function Landing() {
  const [categories, setCategories] = useState([]);
  const [featuredServices, setFeaturedServices] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSnapToFix, setShowSnapToFix] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [catRes, servRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/categories`),
        axios.get(`${API_URL}/api/services?limit=9`),
        axios.get(`${API_URL}/api/stats`)
      ]);
      setCategories(catRes.data);
      setFeaturedServices(servRes.data.services || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[95vh] flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" />
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-500 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-orange-500 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          </div>
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }} />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 md:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm mb-6"
            >
              <Sparkles className="w-4 h-4 text-yellow-400" />
              Powered by Llama 3.3 • Ultra-Fast AI
            </motion.div>

            <h1 className="font-cabinet text-5xl sm:text-6xl lg:text-8xl font-black text-white mb-6 tracking-tight leading-tight">
              <span className="gradient-text">Jamshedpur's</span>
              <br />
              Service Hub
            </h1>
            
            <p className="text-xl md:text-2xl text-white/70 mb-10 max-w-3xl mx-auto leading-relaxed">
              Discover {stats?.total_services || '50+'}  trusted local services. 
              From emergency repairs to restaurants — find what you need, <span className="text-[#E23744] font-semibold">instantly</span>.
            </p>
          </motion.div>

          {/* Smart Search */}
          <div className="mb-12">
            <SmartSearch onSnapToFix={() => setShowSnapToFix(true)} />
          </div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
          >
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <div className="text-3xl md:text-4xl font-bold text-white">{stats?.total_services || '50'}+</div>
              <div className="text-white/60 text-sm">Services</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <div className="text-3xl md:text-4xl font-bold text-white">{stats?.verified_services || '30'}+</div>
              <div className="text-white/60 text-sm">Verified</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <div className="text-3xl md:text-4xl font-bold text-white">{stats?.emergency_services || '15'}+</div>
              <div className="text-white/60 text-sm">24/7 Emergency</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <div className="text-3xl md:text-4xl font-bold text-white">20+</div>
              <div className="text-white/60 text-sm">Areas Covered</div>
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
      <section className="py-4 bg-gradient-to-r from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-y border-gray-100 dark:border-gray-800">
        <div className="flex items-center">
          <div className="flex items-center gap-2 px-4 md:px-8 text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
            <TrendingUp className="w-4 h-4 text-[#E23744]" />
            Trending
          </div>
          <Marquee gradient={false} speed={40} className="overflow-hidden">
            {TRENDING_SEARCHES.map((search, index) => (
              <button
                key={index}
                onClick={() => navigate(`/services?search=${encodeURIComponent(search)}`)}
                className="mx-3 px-4 py-2 rounded-full bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:bg-[#E23744] hover:text-white transition-all duration-300 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md"
              >
                {search}
              </button>
            ))}
          </Marquee>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 md:py-24 px-4 md:px-8 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="inline-block px-4 py-1 rounded-full bg-[#E23744]/10 text-[#E23744] text-sm font-medium mb-4">
              {categories.length} Categories
            </span>
            <h2 className="font-cabinet text-3xl md:text-5xl font-bold text-gray-800 dark:text-white mb-4">
              Browse by Category
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl mx-auto">
              From home services to restaurants — everything Jamshedpur needs
            </p>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {categories.map((category, index) => (
                <CategoryCard key={category.id} category={category} index={index} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* AI Features Section */}
      <section className="py-16 md:py-24 px-4 md:px-8 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden relative">
        {/* Background elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-rose-500 rounded-full filter blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/90 text-sm font-medium mb-6">
              <Zap className="w-4 h-4 text-yellow-400" />
              Intelligence Layer
            </span>
            <h2 className="font-cabinet text-3xl md:text-5xl font-bold mb-4">
              AI That Understands You
            </h2>
            <p className="text-white/70 text-lg max-w-2xl mx-auto">
              Powered by Llama 3.3 via Groq for ultra-fast inference. Search in Hinglish, get instant results.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Semantic Search */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/10"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center mb-6">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">Semantic Intent Parsing</h3>
              <p className="text-white/60 mb-4">
                Understands Hinglish & slang. "Bijli band hai" → Electrician category
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-white/70">
                  <ChevronRight className="w-4 h-4 text-purple-400" />
                  <span>"Nal se paani leak" → Plumber</span>
                </div>
                <div className="flex items-center gap-2 text-white/70">
                  <ChevronRight className="w-4 h-4 text-purple-400" />
                  <span>"AC theek karana hai" → AC Repair</span>
                </div>
              </div>
            </motion.div>

            {/* Urgency Detection */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/10"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center mb-6">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">Urgency Detection</h3>
              <p className="text-white/60 mb-4">
                AI detects distress in your message and prioritizes emergency services.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-white/70">
                  <ChevronRight className="w-4 h-4 text-red-400" />
                  <span>"Urgent plumber chahiye" → Emergency mode</span>
                </div>
                <div className="flex items-center gap-2 text-white/70">
                  <ChevronRight className="w-4 h-4 text-red-400" />
                  <span>"Help! Light nahi aa rahi" → Priority</span>
                </div>
              </div>
            </motion.div>

            {/* Dynamic Radius */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/10"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-6">
                <MapPin className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">Dynamic Radius Expansion</h3>
              <p className="text-white/60 mb-4">
                No empty results ever. Auto-expands from 2km → 5km → 10km until found.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-white/70">
                  <ChevronRight className="w-4 h-4 text-green-400" />
                  <span>Proximity-based ranking</span>
                </div>
                <div className="flex items-center gap-2 text-white/70">
                  <ChevronRight className="w-4 h-4 text-green-400" />
                  <span>MongoDB 2dsphere indexing</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Services Section */}
      <section className="py-16 md:py-24 px-4 md:px-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12"
          >
            <div>
              <span className="inline-block px-4 py-1 rounded-full bg-[#E23744]/10 text-[#E23744] text-sm font-medium mb-4">
                {featuredServices.length}+ Services Live
              </span>
              <h2 className="font-cabinet text-3xl md:text-5xl font-bold text-gray-800 dark:text-white mb-2">
                Top Rated Services
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                Verified providers with AI trust scores
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/services')}
              className="hidden md:flex rounded-full px-8 border-2"
              data-testid="view-all-services"
            >
              View All {stats?.total_services || ''} Services
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

          <div className="mt-10 text-center md:hidden">
            <Button
              onClick={() => navigate('/services')}
              className="bg-[#E23744] hover:bg-[#BE123C] text-white rounded-full px-8"
            >
              View All Services
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 md:py-24 px-4 md:px-8 bg-white dark:bg-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="inline-block px-4 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium mb-4">
                Trust System
              </span>
              <h2 className="font-cabinet text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-6">
                AI-Powered Trust Scores
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
                No fake reviews. Our AI analyzes patterns, detects suspicious activity, 
                and gives you genuine trust scores for every service.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white">Fake Review Detection</h4>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">AI flags suspicious patterns and duplicate content</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white">Community Vouches</h4>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Real people vouching for services they've used</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white">Verified Businesses</h4>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Identity-verified service providers you can trust</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-3xl p-8">
                <div className="text-center mb-6">
                  <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white mb-4">
                    <span className="text-4xl font-bold">92</span>
                  </div>
                  <h4 className="font-bold text-gray-800 dark:text-white text-lg">Trust Score</h4>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Raju Plumbing Services</p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Review authenticity</span>
                    <span className="font-medium text-green-600">Excellent</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Community vouches</span>
                    <span className="font-medium text-gray-800 dark:text-white">15 vouches</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Response rate</span>
                    <span className="font-medium text-green-600">98%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Verified business</span>
                    <span className="font-medium text-green-600">Yes</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 px-4 md:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-[#E23744] via-[#F97316] to-[#E23744] rounded-3xl p-10 md:p-16 text-white relative overflow-hidden"
          >
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full filter blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full filter blur-3xl" />
            </div>

            <div className="relative z-10">
              <h2 className="font-cabinet text-3xl md:text-5xl font-bold mb-6">
                Ready to find your service?
              </h2>
              <p className="text-white/80 mb-10 text-lg max-w-xl mx-auto">
                Join thousands of Jamshedpur residents who trust CIVIX for their daily service needs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => navigate('/services')}
                  className="bg-white text-[#E23744] hover:bg-gray-100 rounded-full px-10 py-6 text-lg font-semibold shadow-xl"
                  data-testid="explore-services-cta"
                >
                  Explore Services
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  onClick={() => navigate('/register')}
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white/10 rounded-full px-10 py-6 text-lg font-semibold"
                  data-testid="join-cta"
                >
                  List Your Business
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Snap to Fix Modal */}
      <SnapToFix isOpen={showSnapToFix} onClose={() => setShowSnapToFix(false)} />
    </div>
  );
}
