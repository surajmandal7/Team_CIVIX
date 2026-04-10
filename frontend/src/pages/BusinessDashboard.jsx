import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Star, MessageSquare, IndianRupee, TrendingUp, Calendar, LogOut, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';

export default function BusinessDashboard() {
  const { user, logout } = useAuth();

  const stats = [
    { label: 'Total Earnings', value: '₹42,500', icon: IndianRupee, color: 'bg-green-500' },
    { label: 'Total Bookings', value: '156', icon: Calendar, color: 'bg-blue-500' },
    { label: 'Avg Rating', value: '4.8', icon: Star, color: 'bg-yellow-500' },
    { label: 'New Reviews', value: '24', icon: MessageSquare, color: 'bg-purple-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-24 pb-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="font-cabinet text-3xl font-black text-gray-900 dark:text-white mb-2">
              Partner Dashboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Manage your services and grow your business, {user?.name || 'Partner'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button className="bg-gradient-to-r from-[#E23744] to-[#F97316] text-white rounded-xl font-bold px-6">
              <Plus className="w-5 h-5 mr-2" />
              Add New Service
            </Button>
            <Button 
              onClick={logout}
              variant="outline"
              className="rounded-xl font-bold px-6"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800"
            >
              <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center mb-4 shadow-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</h3>
            </motion.div>
          ))}
        </div>

        {/* Placeholder for Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Active Bookings</h2>
                <Button variant="ghost" className="text-[#E23744]">View All</Button>
              </div>
              <div className="space-y-6">
                {[1, 2, 3].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                    <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <IndianRupee className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Home Cleaning Service</p>
                      <p className="text-xs text-gray-500">Customer: Amit Kumar • Sakchi</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-500">₹850</p>
                      <p className="text-xs text-gray-500">Today, 2:00 PM</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-8">
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Performance</h2>
              <div className="flex items-center justify-center p-6 h-48 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 text-[#E23744] mx-auto mb-2" />
                  <p className="text-sm text-gray-500">15% increase in bookings<br />this week</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
