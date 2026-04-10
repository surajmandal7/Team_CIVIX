import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Mic, Camera, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SEARCH_SUGGESTIONS = [
  "AC repair in Kadma",
  "Plumber near Bistupur",
  "Electrician emergency",
  "Bijli theek karani hai",
  "Nal leak ho raha hai",
  "Home cleaning Sonari",
  "Carpenter for furniture",
  "Beauty salon Telco"
];

export default function SmartSearch({ onSnapToFix }) {
  const [query, setQuery] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef(null);
  const navigate = useNavigate();

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

  // Voice search
  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice search is not supported in your browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'hi-IN'; // Hindi for Hinglish support
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      await processVoiceQuery(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const processVoiceQuery = async (voiceQuery) => {
    setIsProcessing(true);
    try {
      const response = await axios.post(`${API_URL}/api/ai/voice-search`, {
        query: voiceQuery
      });
      
      const { service_category, search_terms, urgency } = response.data;
      
      let searchPath = '/services?';
      if (service_category) searchPath += `category=${service_category}&`;
      if (search_terms) searchPath += `search=${encodeURIComponent(search_terms)}&`;
      if (urgency === 'emergency') searchPath += 'emergency=true';
      
      navigate(searchPath);
    } catch (error) {
      console.error('Voice search error:', error);
      navigate(`/services?search=${encodeURIComponent(voiceQuery)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/services?search=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    
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

  const selectSuggestion = (suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    navigate(`/services?search=${encodeURIComponent(suggestion)}`);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <motion.form
        onSubmit={handleSearch}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative"
      >
        <div className="relative flex items-center bg-white dark:bg-gray-800 rounded-full shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
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
            className="flex-1 py-4 px-2 bg-transparent text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none text-lg"
            data-testid="smart-search-input"
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setShowSuggestions(false);
              }}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Voice Search Button */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={startVoiceSearch}
            disabled={isListening || isProcessing}
            className={`p-3 mx-1 rounded-full transition-colors ${
              isListening 
                ? 'bg-[#E23744] voice-pulse' 
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
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-[#E23744] hover:bg-[#BE123C] text-white px-8 py-4 font-semibold transition-colors"
            data-testid="search-submit-btn"
          >
            Search
          </motion.button>
        </div>
      </motion.form>

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
