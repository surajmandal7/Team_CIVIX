import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Phone, Mail, MapPin, Facebook, Twitter, Instagram, Youtube, Heart } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-900 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Section */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E23744] to-[#F97316] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="font-cabinet text-2xl font-black tracking-tighter text-gray-900 dark:text-white">
                CIVIX
              </span>
            </Link>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
              Jamshedpur's premier AI-powered hyperlocal services platform. Connecting you with trusted local professionals for all your home and business needs.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-400 hover:text-[#E23744] transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-400 hover:text-[#E23744] transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-400 hover:text-[#E23744] transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-400 hover:text-[#E23744] transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-cabinet text-lg font-bold text-gray-900 dark:text-white mb-6">Explore</h3>
            <ul className="space-y-4">
              <li>
                <Link to="/services" className="text-gray-500 dark:text-gray-400 hover:text-[#E23744] transition-colors">Browse Services</Link>
              </li>
              <li>
                <Link to="/services?category=plumbing" className="text-gray-500 dark:text-gray-400 hover:text-[#E23744] transition-colors">Emergency Plumbing</Link>
              </li>
              <li>
                <Link to="/services?category=electrical" className="text-gray-500 dark:text-gray-400 hover:text-[#E23744] transition-colors">Electrical Works</Link>
              </li>
              <li>
                <Link to="/services?category=ac_repair" className="text-gray-500 dark:text-gray-400 hover:text-[#E23744] transition-colors">AC Maintenance</Link>
              </li>
              <li>
                <Link to="/services?category=cleaning" className="text-gray-500 dark:text-gray-400 hover:text-[#E23744] transition-colors">Deep Cleaning</Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-cabinet text-lg font-bold text-gray-900 dark:text-white mb-6">Support</h3>
            <ul className="space-y-4">
              <li>
                <Link to="/login" className="text-gray-500 dark:text-gray-400 hover:text-[#E23744] transition-colors">My Account</Link>
              </li>
              <li>
                <Link to="/bookmarks" className="text-gray-500 dark:text-gray-400 hover:text-[#E23744] transition-colors">Saved Services</Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-gray-500 dark:text-gray-400 hover:text-[#E23744] transition-colors">Service History</Link>
              </li>
              <li>
                <a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#E23744] transition-colors">Help Center</a>
              </li>
              <li>
                <a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#E23744] transition-colors">Privacy Policy</a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-cabinet text-lg font-bold text-gray-900 dark:text-white mb-6">Contact Us</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-gray-500 dark:text-gray-400">
                <MapPin className="w-5 h-5 text-[#E23744] shrink-0" />
                <span>Bistupur Market, Jamshedpur,<br />Jharkhand 831001</span>
              </li>
              <li className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                <Phone className="w-5 h-5 text-[#E23744] shrink-0" />
                <span>+91 98765 43210</span>
              </li>
              <li className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                <Mail className="w-5 h-5 text-[#E23744] shrink-0" />
                <span>support@civix.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-8 border-t border-gray-100 dark:border-gray-900 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            © {currentYear} CIVIX. All rights reserved.
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-1 justify-center">
            Made with <Heart className="w-4 h-4 text-[#E23744] fill-[#E23744]" /> for Jamshedpur
          </p>
        </div>
      </div>
    </footer>
  );
}
