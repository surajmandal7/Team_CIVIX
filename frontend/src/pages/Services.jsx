import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Search, Filter, MapPin, List, LayoutGrid, Star, X, 
  SlidersHorizontal, ChevronDown, Sparkles, Zap, AlertTriangle
} from 'lucide-react';
import axios from 'axios';
import ServiceCard from '../components/ServiceCard';
import SmartSearch from '../components/SmartSearch';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Services() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState('grid');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedArea, setSelectedArea] = useState(searchParams.get('area') || '');
  const [minRating, setMinRating] = useState(searchParams.get('rating') || '');
  const [emergencyOnly, setEmergencyOnly] = useState(searchParams.get('emergency') === 'true');
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [aiParsedIntent, setAiParsedIntent] = useState(null);

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        () => {
          setUserLocation({ lat: 22.7857, lon: 86.2029 }); // Jamshedpur center
        }
      );
    }
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchServices();
  }, [selectedCategory, selectedArea, minRating, emergencyOnly, searchQuery, userLocation]);

  const handleCategoryChange = (value) => {
    setSelectedCategory(value === 'all' ? '' : value);
  };

  const handleAreaChange = (value) => {
    setSelectedArea(value === 'all' ? '' : value);
  };

  const handleRatingChange = (value) => {
    setMinRating(value === 'any' ? '' : value);
  };

  const fetchInitialData = async () => {
    try {
      const [catRes, areaRes] = await Promise.all([
        axios.get(`${API_URL}/api/categories`),
        axios.get(`${API_URL}/api/areas`)
      ]);
      setCategories(catRes.data);
      setAreas(areaRes.data);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchServices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('civix_token');
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      
      let url = `${API_URL}/api/services?limit=100`;
      if (selectedCategory) url += `&category=${selectedCategory}`;
      if (selectedArea) url += `&area=${selectedArea}`;
      if (minRating) url += `&min_rating=${minRating}`;
      if (emergencyOnly) url += `&is_emergency=true`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      if (userLocation) {
        url += `&latitude=${userLocation.lat}&longitude=${userLocation.lon}`;
      }

      const response = await axios.get(url, config);
      setServices(response.data.services || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookmark = async (serviceId) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const service = services.find(s => s.id === serviceId);
    const isCurrentlyBookmarked = service?.is_bookmarked;

    try {
      const token = localStorage.getItem('civix_token');
      if (isCurrentlyBookmarked) {
        await axios.delete(`${API_URL}/api/bookmarks/${serviceId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Removed from bookmarks');
      } else {
        await axios.post(`${API_URL}/api/bookmarks`, 
          { service_id: serviceId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Added to bookmarks');
      }
      
      // Update local state
      setServices(services.map(s => 
        s.id === serviceId ? { ...s, is_bookmarked: !isCurrentlyBookmarked } : s
      ));
    } catch (error) {
      toast.error('Failed to update bookmark');
    }
  };

  const handleIntelligentSearch = async (query) => {
    setLoading(true);
    setSearchQuery(query);
    
    try {
      const response = await axios.post(`${API_URL}/api/search/intelligent`, {
        query: query,
        latitude: userLocation?.lat,
        longitude: userLocation?.lon,
        radius_km: 10.0
      });
      
      const { parsed_intent, is_urgent, services: searchResults } = response.data;
      setAiParsedIntent({ ...parsed_intent, is_urgent });
      
      // Set services directly from AI response
      setServices(searchResults || []);
      setTotal(searchResults?.length || 0);
      
      // Don't trigger re-fetch by setting these silently
      // The AI search results are already filtered
      setLoading(false);
      return; // Exit early to prevent re-fetch
    } catch (error) {
      console.error('Intelligent search error:', error);
      fetchServices();
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      handleIntelligentSearch(searchQuery.trim());
    } else {
      fetchServices();
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedArea('');
    setMinRating('');
    setEmergencyOnly(false);
    setAiParsedIntent(null);
    setSearchParams({});
  };

  const hasActiveFilters = selectedCategory || selectedArea || minRating || emergencyOnly || searchQuery;

  const getCategoryName = (id) => {
    const cat = categories.find(c => c.id === id);
    return cat?.name || id?.replace('_', ' ');
  };

  return (
    <div className="min-h-screen pt-20 pb-24 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div>
              <h1 className="font-cabinet text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-2">
                {selectedCategory ? getCategoryName(selectedCategory) : 'All Services'}
                {selectedArea && ` in ${selectedArea}`}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <span>{total} services available</span>
                {userLocation && (
                  <>
                    <span className="text-gray-300">•</span>
                    <MapPin className="w-4 h-4 text-[#E23744]" />
                    <span>Sorted by distance</span>
                  </>
                )}
              </p>
            </div>
            
            {/* AI Intent Display */}
            <AnimatePresence>
              {aiParsedIntent && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30"
                >
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm text-purple-700 dark:text-purple-300">
                    AI: <span className="font-medium capitalize">{aiParsedIntent.service_category?.replace('_', ' ')}</span>
                  </span>
                  {aiParsedIntent.is_urgent && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs">
                      <Zap className="w-3 h-3" />
                      Urgent
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Search & Filters Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-6">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in Hinglish... e.g., 'bijli wala', 'nal theek karao'"
                className="pl-12 h-12 rounded-xl text-base"
                data-testid="services-search-input"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="h-12 px-4 rounded-xl"
                data-testid="toggle-filters-btn"
              >
                <SlidersHorizontal className="w-5 h-5 mr-2" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-2 w-5 h-5 rounded-full bg-[#E23744] text-white text-xs flex items-center justify-center">
                    !
                  </span>
                )}
              </Button>
              
              <Button
                type="submit"
                className="h-12 px-6 rounded-xl bg-gradient-to-r from-[#E23744] to-[#F97316] hover:from-[#BE123C] hover:to-[#E65100] text-white"
                data-testid="search-btn"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Search
              </Button>
            </div>
          </form>

          {/* Expanded Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Category Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Category
                      </label>
                      <Select value={selectedCategory || 'all'} onValueChange={handleCategoryChange}>
                        <SelectTrigger className="rounded-xl" data-testid="category-filter">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Area Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Area
                      </label>
                      <Select value={selectedArea || 'all'} onValueChange={handleAreaChange}>
                        <SelectTrigger className="rounded-xl" data-testid="area-filter">
                          <SelectValue placeholder="All Areas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Areas</SelectItem>
                          {areas.map(area => (
                            <SelectItem key={area.name || area} value={area.name || area}>
                              {area.name || area}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Rating Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Minimum Rating
                      </label>
                      <Select value={minRating || 'any'} onValueChange={handleRatingChange}>
                        <SelectTrigger className="rounded-xl" data-testid="rating-filter">
                          <SelectValue placeholder="Any Rating" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any Rating</SelectItem>
                          <SelectItem value="4.5">4.5+ Stars</SelectItem>
                          <SelectItem value="4">4+ Stars</SelectItem>
                          <SelectItem value="3.5">3.5+ Stars</SelectItem>
                          <SelectItem value="3">3+ Stars</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Emergency Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Emergency Services
                      </label>
                      <Button
                        type="button"
                        variant={emergencyOnly ? 'default' : 'outline'}
                        onClick={() => setEmergencyOnly(!emergencyOnly)}
                        className={`w-full rounded-xl h-10 ${emergencyOnly ? 'bg-red-500 hover:bg-red-600' : ''}`}
                        data-testid="emergency-filter"
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        {emergencyOnly ? '24/7 Emergency Only' : 'Show All'}
                      </Button>
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <div className="mt-4 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={clearFilters}
                        className="text-gray-500"
                        data-testid="clear-filters-btn"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Clear All Filters
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Active Filter Pills */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-6">
            {selectedCategory && (
              <span className="filter-chip active flex items-center gap-2">
                {getCategoryName(selectedCategory)}
                <X className="w-4 h-4 cursor-pointer" onClick={() => setSelectedCategory('')} />
              </span>
            )}
            {selectedArea && (
              <span className="filter-chip active flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {selectedArea}
                <X className="w-4 h-4 cursor-pointer" onClick={() => setSelectedArea('')} />
              </span>
            )}
            {minRating && (
              <span className="filter-chip active flex items-center gap-2">
                <Star className="w-4 h-4" />
                {minRating}+ Stars
                <X className="w-4 h-4 cursor-pointer" onClick={() => setMinRating('')} />
              </span>
            )}
            {emergencyOnly && (
              <span className="filter-chip active flex items-center gap-2 bg-red-500 border-red-500">
                <AlertTriangle className="w-4 h-4" />
                Emergency Only
                <X className="w-4 h-4 cursor-pointer" onClick={() => setEmergencyOnly(false)} />
              </span>
            )}
            {searchQuery && (
              <span className="filter-chip active flex items-center gap-2">
                <Search className="w-4 h-4" />
                "{searchQuery}"
                <X className="w-4 h-4 cursor-pointer" onClick={() => setSearchQuery('')} />
              </span>
            )}
          </div>
        )}

        {/* Services Grid */}
        {loading ? (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {[...Array(9)].map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : services.length > 0 ? (
          <motion.div 
            layout
            className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}
          >
            {services.map((service, index) => (
              <ServiceCard 
                key={service.id} 
                service={service} 
                index={index}
                isBookmarked={service.is_bookmarked}
                onBookmark={handleBookmark}
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
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              No services found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Try adjusting your filters or search terms
            </p>
            <Button onClick={clearFilters} variant="outline" className="rounded-full">
              Clear All Filters
            </Button>
          </motion.div>
        )}
      </div>

      {/* View Toggle (Fixed at bottom) */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-30">
        <div className="bg-gray-900 dark:bg-gray-700 rounded-full p-1.5 flex shadow-xl border border-gray-700">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-5 py-2.5 rounded-full font-medium transition-all flex items-center gap-2 ${
              viewMode === 'grid' 
                ? 'bg-white text-gray-900 shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
            data-testid="grid-view-btn"
          >
            <LayoutGrid className="w-4 h-4" />
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-5 py-2.5 rounded-full font-medium transition-all flex items-center gap-2 ${
              viewMode === 'list' 
                ? 'bg-white text-gray-900 shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
            data-testid="list-view-btn"
          >
            <List className="w-4 h-4" />
            List
          </button>
        </div>
      </div>
    </div>
  );
}
