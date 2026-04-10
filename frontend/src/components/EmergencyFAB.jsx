import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Phone, Zap, Droplets, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';

export default function EmergencyFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const emergencyServices = [
    { id: 'electrical', name: 'Electrician', icon: Zap, color: 'bg-yellow-500' },
    { id: 'plumbing', name: 'Plumber', icon: Droplets, color: 'bg-blue-500' },
    { id: 'appliance', name: 'Appliance', icon: Wrench, color: 'bg-green-500' },
  ];

  const handleEmergencyClick = (category) => {
    navigate(`/services?category=${category}&emergency=true`);
    setIsOpen(false);
  };

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB and Menu */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              className="absolute bottom-20 right-0 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 w-64 z-[60]"
              data-testid="emergency-menu"
            >
              <h3 className="font-cabinet font-bold text-lg mb-3 text-gray-800 dark:text-white">
                Emergency Services
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Get immediate help from nearby verified professionals
              </p>
              <div className="space-y-2">
                {emergencyServices.map((service) => (
                  <motion.button
                    key={service.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleEmergencyClick(service.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    data-testid={`emergency-${service.id}`}
                  >
                    <div className={`w-10 h-10 rounded-full ${service.color} flex items-center justify-center`}>
                      <service.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-800 dark:text-white">{service.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">24/7 Available</p>
                    </div>
                  </motion.button>
                ))}
              </div>
              <Button
                onClick={() => navigate('/services?emergency=true')}
                className="w-full mt-4 bg-[#E23744] hover:bg-[#BE123C] text-white"
                data-testid="view-all-emergency"
              >
                View All Emergency Services
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAB Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(!isOpen)}
          className={`relative w-16 h-16 rounded-full flex items-center justify-center fab-shadow transition-colors ${
            isOpen ? 'bg-gray-800' : 'bg-[#E23744]'
          }`}
          data-testid="emergency-fab"
        >
          {/* Pulse rings */}
          {!isOpen && (
            <>
              <span className="absolute inset-0 rounded-full bg-[#E23744] pulse-ring" />
              <span className="absolute inset-0 rounded-full bg-[#E23744] pulse-ring" style={{ animationDelay: '0.5s' }} />
            </>
          )}
          
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
              >
                <X className="w-7 h-7 text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="alert"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
              >
                <AlertTriangle className="w-7 h-7 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </>
  );
}
