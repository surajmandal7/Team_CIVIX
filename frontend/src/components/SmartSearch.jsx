import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Mic, Camera, X, Loader2, Sparkles, MapPin, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useVoiceSearch } from '../hooks/use-voice-search';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SEARCH_SUGGESTIONS = [
  "AC repair in Kadma",
  "Plumber near Bistupur",
  "Electrician emergency",
  "Bijli theek karani hai",
  "Nal se paani leak",
  "Best biryani in Mango",
  "Salon near me",
  "24/7 pharmacy",
  "Chai cafe Sakchi",
  "Car service Adityapur"
];

export default function SmartSearch({ onSnapToFix, compact = false }) {
  const [query, setQuery] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [aiParsed, setAiParsed] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const { isListening, startVoiceSearch } = useVoiceSearch(async (transcript) => {
    setQuery(transcript);
    await processIntelligentSearch(transcript);
  });

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        () => {
          // Default to Jamshedpur center
          setUserLocation({ lat: 22.7857, lon: 86.2029 });
        }
      );
    }
  }, []);

  // Animated placeholder
  useEffect(() => {
    const currentSuggestion = SEARCH_SUGGESTIONS[placeholderIndex];
    let charIndex = 0;
    
    const typeInterval = setInterval(() => {
      if (charIndex <= currentSuggestion.length) {
        setPlaceholder(currentSuggestion.slice(0, charIndex));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setTimeout(() => {
          setPlaceholderIndex((prev) => (prev + 1) % SEARCH_SUGGESTIONS.length);
        }, 2000);
      }
    }, 50);

    return () => clearInterval(typeInterval);
  }, [placeholderIndex]);



  const processIntelligentSearch = async (searchQuery) => {
    setIsProcessing(true);
    try {
      const response = await axios.post(`${API_URL}/api/search/intelligent`, {
        query: searchQuery,
        latitude: userLocation?.lat,
        longitude: userLocation?.lon,
        radius_km: 5.0
      });
      
      const { parsed_intent, is_urgent, services, search_radius_used } = response.data;
      setAiParsed(parsed_intent);
      
      // Build search URL with parsed intent
      let searchPath = '/services?';
      if (parsed_intent.service_category) searchPath += `category=${parsed_intent.service_category}&`;
      searchPath += `search=${encodeURIComponent(searchQuery)}&`;
      if (is_urgent) searchPath += 'emergency=true&';
      if (userLocation) {
        searchPath += `lat=${userLocation.lat}&lon=${userLocation.lon}&`;
      }
      
      navigate(searchPath);
    } catch (error) {
      console.error('Intelligent search error:', error);
      navigate(`/services?search=${encodeURIComponent(searchQuery)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (query.trim()) {
      await processIntelligentSearch(query.trim());
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setAiParsed(null);
    
    if (value.length > 1) {
      const filtered = SEARCH_SUGGESTIONS.filter(s => 
        s.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = async (suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    await processIntelligentSearch(suggestion);
  };

  if (compact) {
    return (
      <form onSubmit={handleSearch} className="relative w-full">
        <div className="relative flex items-center bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center pl-4 pr-2">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="Search services..."
            className="flex-1 py-2 px-2 bg-transparent text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none text-sm"
            data-testid="compact-search-input"
          />
          <button
            type="submit"
            className="bg-[#E23744] hover:bg-[#BE123C] text-white px-4 py-2 text-sm font-medium"
          >
            Search
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      <motion.form
        onSubmit={handleSearch}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative"
      >
        {/* AI Badge */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute -top-3 left-6 z-10"
        >
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-medium shadow-lg">
            <Sparkles className="w-3 h-3" />
            AI-Powered • Hinglish Support
          </span>
        </motion.div>

        <div className="relative flex items-center bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border-2 border-gray-100 dark:border-gray-700 hover:border-[#E23744]/30 transition-colors">
          <div className="flex items-center pl-6 pr-2">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => query.length > 1 && suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={placeholder || "Search services..."}
            className="flex-1 py-5 px-2 bg-transparent text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none text-lg"
            data-testid="smart-search-input"
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setShowSuggestions(false);
                setAiParsed(null);
              }}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Location Indicator */}
          {userLocation && (
            <div className="hidden md:flex items-center gap-1 px-3 text-sm text-gray-500 border-l border-gray-200 dark:border-gray-700">
              <MapPin className="w-4 h-4 text-[#E23744]" />
              <span>Jamshedpur</span>
            </div>
          )}

          {/* Voice Search Button */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={startVoiceSearch}
            disabled={isListening || isProcessing}
            className={`p-3 mx-1 rounded-full transition-all ${
              isListening 
                ? 'bg-[#E23744] voice-pulse shadow-lg shadow-red-500/30' 
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            data-testid="voice-search-btn"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 text-gray-600 dark:text-gray-300 animate-spin" />
            ) : (
              <Mic className={`w-5 h-5 ${isListening ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`} />
            )}
          </motion.button>

          {/* Snap to Fix Button */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onSnapToFix}
            className="p-3 mr-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            data-testid="snap-to-fix-btn"
          >
            <Camera className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </motion.button>

          {/* Search Button */}
          <motion.button
            type="submit"
            disabled={isProcessing}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-gradient-to-r from-[#E23744] to-[#F97316] hover:from-[#BE123C] hover:to-[#E65100] text-white px-8 py-5 font-semibold transition-all flex items-center gap-2"
            data-testid="search-submit-btn"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Search
              </>
            )}
          </motion.button>
        </div>
      </motion.form>

      {/* AI Parsed Intent Display */}
      <AnimatePresence>
        {aiParsed && aiParsed.service_category && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 px-4"
          >
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>AI understood:</span>
              <span className="font-medium text-[#E23744] capitalize">
                {aiParsed.service_category.replace('_', ' ')}
              </span>
              {aiParsed.is_urgent && (
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-medium">
                  Urgent
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden z-50 border border-gray-100 dark:border-gray-700"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => selectSuggestion(suggestion)}
                className="w-full px-6 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-200"
              >
                <Search className="w-4 h-4 text-gray-400" />
                {suggestion}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
