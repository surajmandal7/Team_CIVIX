import React from 'react';
import { motion } from 'framer-motion';
import { 
  Droplets, Zap, Sparkles, Scissors, Fan, Hammer, 
  Paintbrush, Bug, Wrench, GraduationCap, Utensils, Truck 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const iconMap = {
  droplets: Droplets,
  zap: Zap,
  sparkles: Sparkles,
  scissors: Scissors,
  fan: Fan,
  hammer: Hammer,
  paintbrush: Paintbrush,
  bug: Bug,
  wrench: Wrench,
  'graduation-cap': GraduationCap,
  utensils: Utensils,
  truck: Truck
};

const colorMap = {
  plumbing: 'from-blue-500 to-blue-600',
  electrical: 'from-yellow-500 to-orange-500',
  cleaning: 'from-cyan-500 to-teal-500',
  beauty: 'from-pink-500 to-rose-500',
  ac_repair: 'from-sky-500 to-blue-500',
  carpentry: 'from-amber-600 to-orange-600',
  painting: 'from-purple-500 to-indigo-500',
  pest_control: 'from-green-600 to-emerald-600',
  appliance: 'from-gray-600 to-gray-700',
  tutor: 'from-indigo-500 to-purple-500',
  catering: 'from-red-500 to-orange-500',
  moving: 'from-emerald-500 to-green-600'
};

export default function CategoryCard({ category, index = 0 }) {
  const navigate = useNavigate();
  const IconComponent = iconMap[category.icon] || Wrench;
  const gradientClass = colorMap[category.id] || 'from-gray-500 to-gray-600';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.05, y: -4 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => navigate(`/services?category=${category.id}`)}
      className="cursor-pointer group"
      data-testid={`category-${category.id}`}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 md:p-6 text-center shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-300 group-hover:shadow-lg group-hover:border-[#E23744]/20">
        <div className={`w-14 h-14 md:w-16 md:h-16 mx-auto rounded-2xl bg-gradient-to-br ${gradientClass} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
          <IconComponent className="w-7 h-7 md:w-8 md:h-8 text-white" />
        </div>
        <h3 className="font-semibold text-gray-800 dark:text-white text-sm md:text-base">
          {category.name}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 hidden md:block">
          {category.description}
        </p>
      </div>
    </motion.div>
  );
}
