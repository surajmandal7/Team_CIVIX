import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Search, Filter, MapPin, List, Map, Star, X, 
  SlidersHorizontal, ChevronDown
} from 'lucide-react';
import axios from 'axios';
import ServiceCard from '../components/ServiceCard';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Services() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'map'
  
  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedArea, setSelectedArea] = useState(searchParams.get('area') || '');
  const [minRating, setMinRating] = useState(searchParams.get('rating') || '');
  const [emergencyOnly, setEmergencyOnly] = useState(searchParams.get('emergency') === 'true');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchServices();
  }, [selectedCategory, selectedArea, minRating, emergencyOnly, searchQuery]);

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
      let url = `${API_URL}/api/services?limit=50`;
      if (selectedCategory) url += `&category=${selectedCategory}`;
      if (selectedArea) url += `&area=${selectedArea}`;
      if (minRating) url += `&min_rating=${minRating}`;
      if (emergencyOnly) url += `&is_emergency=true`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

      const response = await axios.get(url);
      setServices(response.data.services || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    updateSearchParams();
  };

  const updateSearchParams = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedArea) params.set('area', selectedArea);
    if (minRating) params.set('rating', minRating);
    if (emergencyOnly) params.set('emergency', 'true');
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedArea('');
    setMinRating('');
    setEmergencyOnly(false);
    setSearchParams({});
  };

  const hasActiveFilters = selectedCategory || selectedArea || minRating || emergencyOnly || searchQuery;

  const getCategoryName = (id) => {
    const cat = categories.find(c => c.id === id);
    return cat?.name || id;
  };

  return (
    <div className="min-h-screen pt-20 pb-24 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="py-6">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-cabinet text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-2"
          >
            {selectedCategory ? getCategoryName(selectedCategory) : 'All Services'}
            {selectedArea && ` in ${selectedArea}`}
          </motion.h1>
          <p className="text-gray-500 dark:text-gray-400">
            {total} services available in Jamshedpur
          </p>
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
                placeholder="Search services..."
                className="pl-12 h-12 rounded-xl"
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
                className="h-12 px-6 rounded-xl bg-[#E23744] hover:bg-[#BE123C] text-white"
                data-testid="search-btn"
              >
                Search
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
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="rounded-xl" data-testid="category-filter">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Categories</SelectItem>
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
                      <Select value={selectedArea} onValueChange={setSelectedArea}>
                        <SelectTrigger className="rounded-xl" data-testid="area-filter">
                          <SelectValue placeholder="All Areas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Areas</SelectItem>
                          {areas.map(area => (
                            <SelectItem key={area} value={area}>
                              {area}
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
                      <Select value={minRating} onValueChange={setMinRating}>
                        <SelectTrigger className="rounded-xl" data-testid="rating-filter">
                          <SelectValue placeholder="Any Rating" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Any Rating</SelectItem>
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
                        className={`w-full rounded-xl h-10 ${emergencyOnly ? 'bg-[#E23744] hover:bg-[#BE123C]' : ''}`}
                        data-testid="emergency-filter"
                      >
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
              <span className="filter-chip active flex items-center gap-2">
                Emergency Only
                <X className="w-4 h-4 cursor-pointer" onClick={() => setEmergencyOnly(false)} />
              </span>
            )}
          </div>
        )}

        {/* Services Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : services.length > 0 ? (
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {services.map((service, index) => (
              <ServiceCard key={service.id} service={service} index={index} />
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
        <div className="bg-gray-800 dark:bg-gray-700 rounded-full p-1 flex shadow-lg">
          <button
            onClick={() => setViewMode('grid')}
            className={`toggle-button ${viewMode === 'grid' ? 'active' : ''}`}
            data-testid="grid-view-btn"
          >
            <List className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`toggle-button ${viewMode === 'map' ? 'active' : ''}`}
            data-testid="map-view-btn"
          >
            <Map className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
