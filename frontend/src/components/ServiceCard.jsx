import React from 'react';
import { motion } from 'framer-motion';
import { Star, MapPin, Clock, Shield, Bookmark, BookmarkCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ServiceCard({ service, isBookmarked, onBookmark, index = 0 }) {
  const navigate = useNavigate();

  const getTrustBadgeColor = (score) => {
    if (score >= 85) return 'trust-badge';
    if (score >= 60) return 'trust-badge-warning';
    return 'trust-badge-danger';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 card-hover cursor-pointer group"
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
        <div className="absolute inset-0 service-image-overlay" />
        
        {/* Trust Score Badge */}
        <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-white text-xs font-semibold flex items-center gap-1 ${getTrustBadgeColor(service.trust_score)}`}>
          <Shield className="w-3 h-3" />
          {service.trust_score}% Trust
        </div>

        {/* Emergency Badge */}
        {service.is_emergency && (
          <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-red-500 text-white text-xs font-semibold">
            24/7 Emergency
          </div>
        )}

        {/* Bookmark Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBookmark && onBookmark(service.id);
          }}
          className="absolute bottom-3 right-3 p-2 rounded-full bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 transition-colors"
          data-testid={`bookmark-${service.id}`}
        >
          {isBookmarked ? (
            <BookmarkCheck className="w-5 h-5 text-[#E23744]" />
          ) : (
            <Bookmark className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-800 dark:text-white line-clamp-1">
            {service.name}
          </h3>
          {service.is_verified && (
            <span className="flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Verified
            </span>
          )}
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
          {service.description}
        </p>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-3">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          <span className="font-semibold text-gray-800 dark:text-white">{service.rating}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({service.review_count} reviews)
          </span>
        </div>

        {/* Location & Hours */}
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span className="line-clamp-1">{service.area}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span className="line-clamp-1">{service.working_hours}</span>
          </div>
        </div>

        {/* Price */}
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <span className="price-badge">{service.price_range}</span>
        </div>
      </div>
    </motion.div>
  );
}
