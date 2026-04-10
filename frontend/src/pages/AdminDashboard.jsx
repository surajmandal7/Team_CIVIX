import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Users, Building2, LayoutDashboard, Settings, Bell, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';

export default function AdminDashboard() {
  const { user, logout } = useAuth();

  const stats = [
    { label: 'Total Users', value: '1,284', icon: Users, color: 'bg-blue-500' },
    { label: 'Business Partners', value: '432', icon: Building2, color: 'bg-purple-500' },
    { label: 'Active Services', value: '1,560', icon: LayoutDashboard, color: 'bg-green-500' },
    { label: 'Pending Verifications', value: '12', icon: ShieldCheck, color: 'bg-[#E23744]' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-24 pb-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="font-cabinet text-3xl font-black text-gray-900 dark:text-white mb-2">
              Admin Control Center
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Welcome back, {user?.name || 'Administrator'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="rounded-xl">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="outline" className="rounded-xl">
              <Settings className="w-5 h-5" />
            </Button>
            <Button 
              onClick={logout}
              className="bg-[#E23744] hover:bg-[#BE123C] text-white rounded-xl font-bold px-6"
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
              <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-${stat.color.split('-')[1]}-500/20`}>
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
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Recent Activity</h2>
              <div className="space-y-6">
                {[1, 2, 3].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">New provider registration: Sharma Electricals</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-[#E23744]">Review</Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-8">
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">System Health</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Server Status</span>
                  <span className="text-green-500 font-bold">Online</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">AI Processing</span>
                  <span className="text-green-500 font-bold">Normal</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Database</span>
                  <span className="text-green-500 font-bold">Healthy</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
