import React from 'react';
import { motion } from 'framer-motion';
import { Star, MapPin, Clock, Shield, Bookmark, BookmarkCheck, Users, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ServiceCard({ service, isBookmarked, onBookmark, index = 0 }) {
  const navigate = useNavigate();

  const getTrustBadgeColor = (score) => {
    if (score >= 85) return 'trust-badge';
    if (score >= 60) return 'trust-badge-warning';
    return 'trust-badge-danger';
  };

  const getTrustLabel = (score) => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'New';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer group hover:shadow-xl hover:border-[#E23744]/20 transition-all duration-300"
      onClick={() => navigate(`/services/${service.id}`)}
      data-testid={`service-card-${service.id}`}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={service.images?.[0] || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800'}
          alt={service.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <div className="flex flex-col gap-2">
            {/* Trust Score Badge */}
            <div className={`px-3 py-1.5 rounded-full text-white text-xs font-semibold flex items-center gap-1.5 ${getTrustBadgeColor(service.trust_score)}`}>
              <Shield className="w-3.5 h-3.5" />
              {service.trust_score}% • {getTrustLabel(service.trust_score)}
            </div>
            
            {/* Emergency Badge */}
            {service.is_emergency && (
              <div className="px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-semibold animate-pulse">
                24/7 Emergency
              </div>
            )}
          </div>

          {/* Bookmark Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBookmark && onBookmark(service.id);
            }}
            className="p-2.5 rounded-full bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-lg"
            data-testid={`bookmark-${service.id}`}
          >
            {isBookmarked ? (
              <BookmarkCheck className="w-5 h-5 text-[#E23744]" />
            ) : (
              <Bookmark className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            )}
          </button>
        </div>

        {/* Bottom overlay info */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          {/* Distance */}
          {service.distance_km && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs">
              <Navigation className="w-3.5 h-3.5" />
              {service.distance_km} km away
            </div>
          )}
          
          {/* Vouches */}
          {service.vouches > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/80 backdrop-blur-sm text-white text-xs">
              <Users className="w-3.5 h-3.5" />
              {service.vouches} vouches
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-800 dark:text-white text-lg line-clamp-1 group-hover:text-[#E23744] transition-colors">
            {service.name}
          </h3>
          {service.is_verified && (
            <span className="flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Verified
            </span>
          )}
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">
          {service.description}
        </p>

        {/* Rating & Reviews */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-50 dark:bg-yellow-900/20">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="font-semibold text-gray-800 dark:text-white">{service.rating}</span>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {service.review_count} reviews
          </span>
        </div>

        {/* Location & Hours */}
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#E23744]" />
            <span className="line-clamp-1">{service.area}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="line-clamp-1">{service.working_hours}</span>
          </div>
        </div>

        {/* Price */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <span className="price-badge text-base">{service.price_range}</span>
          <span className="text-[#E23744] font-medium text-sm group-hover:underline">
            View Details →
          </span>
        </div>
      </div>
    </motion.div>
  );
}
