import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Star, MapPin, Clock, Phone, Shield, ChevronLeft, 
  Bookmark, BookmarkCheck, Share2, MessageCircle, 
  AlertTriangle, CheckCircle, XCircle, Calendar
} from 'lucide-react';
import axios from 'axios';
import BookingForm from '../components/BookingForm';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ServiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  
  const [service, setService] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [trustDetails, setTrustDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const handleBookNowClick = () => {
    if (!isAuthenticated) {
      toast.error('Please login to book a service');
      navigate('/login');
      return;
    }
    setIsBookingModalOpen(true);
  };

  const confirmBooking = (bookingData) => {
    // Already handled in the success state of BookingForm
    // But we can add any additional logic here if needed
  };

  useEffect(() => {
    fetchServiceData();
    
    // Check for booking action in URL
    if (searchParams.get('action') === 'book') {
      // Small delay to ensure service data is loaded
      setTimeout(() => {
        handleBookNowClick();
      }, 500);
    }
  }, [id, searchParams, isAuthenticated]); // Added isAuthenticated to deps to handle redirection after login

  const fetchServiceData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('civix_token');
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      
      const [serviceRes, reviewsRes, trustRes] = await Promise.all([
        axios.get(`${API_URL}/api/services/${id}`, config),
        axios.get(`${API_URL}/api/services/${id}/reviews`),
        axios.get(`${API_URL}/api/ai/trust-score/${id}`)
      ]);
      
      setService(serviceRes.data);
      setIsBookmarked(serviceRes.data.is_bookmarked || false);
      setReviews(reviewsRes.data);
      setTrustDetails(trustRes.data);
    } catch (error) {
      console.error('Error fetching service:', error);
      toast.error('Failed to load service details');
    } finally {
      setLoading(false);
    }
  };

  const handleBookmark = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      const token = localStorage.getItem('civix_token');
      if (isBookmarked) {
        await axios.delete(`${API_URL}/api/bookmarks/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsBookmarked(false);
        toast.success('Removed from bookmarks');
      } else {
        await axios.post(`${API_URL}/api/bookmarks`, 
          { service_id: id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setIsBookmarked(true);
        toast.success('Added to bookmarks');
      }
    } catch (error) {
      toast.error('Failed to update bookmark');
    }
  };

  const handleShare = async (platform = 'native') => {
    const shareUrl = window.location.href;
    const shareTitle = `CIVIX | ${service?.name}`;
    const shareText = `Check out ${service?.name} on CIVIX: ${service?.description}`;

    if (platform === 'native' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Error sharing:', err);
      }
    }

    // Platform specific sharing links
    const links = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      clipboard: shareUrl
    };

    if (platform === 'clipboard') {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard!');
      } catch (err) {
        toast.error('Failed to copy link');
      }
    } else if (links[platform]) {
      window.open(links[platform], '_blank');
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setSubmittingReview(true);
    try {
      const token = localStorage.getItem('civix_token');
      const response = await axios.post(
        `${API_URL}/api/services/${id}/reviews`,
        { service_id: id, rating: reviewRating, comment: reviewComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setReviews([response.data, ...reviews]);
      setShowReviewForm(false);
      setReviewComment('');
      setReviewRating(5);
      toast.success('Review submitted successfully');
      
      // Refresh service data to update rating
      fetchServiceData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const getTrustBadgeColor = (score) => {
    if (score >= 85) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handleContact = () => {
    if (service?.phone) {
      const sanitizedPhone = service.phone.replace(/\s+/g, '');
      window.location.href = `tel:${sanitizedPhone}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 pb-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          <Skeleton className="h-64 md:h-96 rounded-2xl mb-6" />
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-6" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            Service not found
          </h2>
          <Button onClick={() => navigate('/services')} className="rounded-full">
            Browse Services
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Image Gallery */}
      <div className="relative">
        <div className="h-64 md:h-96 overflow-hidden">
          <img
            src={service.images?.[selectedImage] || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800'}
            alt={service.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>

        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-24 left-4 md:left-8 p-2 rounded-full bg-white/90 dark:bg-gray-800/90 shadow-lg"
          data-testid="back-btn"
        >
          <ChevronLeft className="w-6 h-6 text-gray-800 dark:text-white" />
        </button>

        {/* Action Buttons */}
        <div className="absolute top-24 right-4 md:right-8 flex gap-2">
          <button
            onClick={handleBookmark}
            className="p-2 rounded-full bg-white/90 dark:bg-gray-800/90 shadow-lg"
            data-testid="bookmark-detail-btn"
          >
            {isBookmarked ? (
              <BookmarkCheck className="w-6 h-6 text-[#E23744]" />
            ) : (
              <Bookmark className="w-6 h-6 text-gray-800 dark:text-white" />
            )}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-2 rounded-full bg-white/90 dark:bg-gray-800/90 shadow-lg"
                data-testid="share-btn"
              >
                <Share2 className="w-6 h-6 text-gray-800 dark:text-white" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem onClick={() => handleShare('native')} className="flex items-center gap-2 cursor-pointer">
                <Share2 className="w-4 h-4" />
                Native Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('whatsapp')} className="flex items-center gap-2 cursor-pointer">
                <MessageCircle className="w-4 h-4 text-green-500" />
                WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('facebook')} className="flex items-center gap-2 cursor-pointer">
                <div className="w-4 h-4 bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold rounded">f</div>
                Facebook
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('twitter')} className="flex items-center gap-2 cursor-pointer">
                <div className="w-4 h-4 bg-black text-white flex items-center justify-center text-[10px] font-bold rounded">X</div>
                Twitter
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('clipboard')} className="flex items-center gap-2 cursor-pointer">
                <Shield className="w-4 h-4 text-gray-400" />
                Copy Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Thumbnail Gallery */}
        {service.images?.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
            {service.images.map((img, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`gallery-thumb ${selectedImage === index ? 'active' : ''}`}
              >
                <img 
                  src={img} 
                  alt={`${service.name} ${index + 1}`} 
                  className="w-full h-full object-cover rounded-lg" 
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 -mt-10 relative z-10 pb-32">
        {/* Main Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {service.is_verified && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Verified
                  </span>
                )}
                {service.is_emergency && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    24/7 Emergency
                  </span>
                )}
              </div>
              <h1 className="font-cabinet text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
                {service.name}
              </h1>
            </div>
            
            {/* Trust Score */}
            <div className={`flex flex-col items-center p-3 rounded-xl ${getTrustBadgeColor(service.trust_score)} text-white`}>
              <Shield className="w-6 h-6 mb-1" />
              <span className="text-2xl font-bold">{service.trust_score}</span>
              <span className="text-xs">Trust Score</span>
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${i < Math.floor(service.rating) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                />
              ))}
            </div>
            <span className="font-semibold text-gray-800 dark:text-white">{service.rating}</span>
            <span className="text-gray-500 dark:text-gray-400">({service.review_count} reviews)</span>
          </div>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {service.description}
          </p>

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <MapPin className="w-5 h-5 text-[#E23744]" />
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium text-gray-800 dark:text-white">{service.address}, {service.area}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <Clock className="w-5 h-5 text-[#E23744]" />
              <div>
                <p className="text-sm text-gray-500">Working Hours</p>
                <p className="font-medium text-gray-800 dark:text-white">{service.working_hours}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <Phone className="w-5 h-5 text-[#E23744]" />
              <div>
                <p className="text-sm text-gray-500">Contact</p>
                <p className="font-medium text-gray-800 dark:text-white">{service.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="price-badge text-lg">{service.price_range}</div>
            </div>
          </div>
        </motion.div>

        {/* Trust Score Details */}
        {trustDetails && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6"
          >
            <h2 className="font-cabinet text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#E23744]" />
              AI Trust Analysis
            </h2>
            
            {/* Trust Meter */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Trust Score</span>
                <span className="font-semibold text-gray-800 dark:text-white">{trustDetails.overall_score}%</span>
              </div>
              <div className="trust-meter bg-gray-200 dark:bg-gray-700">
                <div 
                  className={`trust-meter-fill ${getTrustBadgeColor(trustDetails.overall_score)}`}
                  style={{ width: `${trustDetails.overall_score}%` }}
                />
              </div>
            </div>

            {/* Trust Factors */}
            {trustDetails.factors?.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Analysis Findings:</p>
                {trustDetails.factors.map((factor, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    {factor.includes('suspicious') || factor.includes('Duplicate') ? (
                      <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                    ) : factor.includes('few') || factor.includes('No reviews') ? (
                      <XCircle className="w-4 h-4 text-gray-400 mt-0.5" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    )}
                    <span className="text-gray-600 dark:text-gray-400">{factor}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Reviews Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-cabinet text-xl font-bold text-gray-800 dark:text-white">
              Reviews ({reviews.length})
            </h2>
            <Button
              onClick={() => isAuthenticated ? setShowReviewForm(!showReviewForm) : navigate('/login')}
              className="bg-[#E23744] hover:bg-[#BE123C] text-white rounded-full"
              data-testid="write-review-btn"
            >
              Write Review
            </Button>
          </div>

          {/* Review Form */}
          {showReviewForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleSubmitReview}
              className="mb-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-700"
            >
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Rating
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1"
                    >
                      <Star
                        className={`w-8 h-8 ${star <= reviewRating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Review
                </label>
                <Textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your experience..."
                  rows={4}
                  className="rounded-xl"
                  required
                  data-testid="review-comment"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReviewForm(false)}
                  className="rounded-full"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingReview}
                  className="bg-[#E23744] hover:bg-[#BE123C] text-white rounded-full"
                  data-testid="submit-review-btn"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </Button>
              </div>
            </motion.form>
          )}

          {/* Reviews List */}
          <div className="space-y-4">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <div key={review.id} className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#E23744] flex items-center justify-center text-white font-semibold">
                        {review.user_name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 dark:text-white">{review.user_name}</p>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 ml-13">{review.comment}</p>
                  {review.is_suspicious && (
                    <div className="flex items-center gap-1 mt-2 text-yellow-600 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      This review may be suspicious
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No reviews yet. Be the first to review!</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Sticky CTA Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 p-4 z-30">
        <div className="max-w-4xl mx-auto flex gap-4">
          <Button
            asChild
            variant="outline"
            className="flex-1 rounded-full h-12"
            data-testid="contact-btn"
          >
            <a href={`tel:${service?.phone?.replace(/\s+/g, '')}`}>
              <Phone className="w-5 h-5 mr-2" />
              Call Now
            </a>
          </Button>
          
          <Button
            onClick={handleBookNowClick}
            className="flex-1 bg-[#E23744] hover:bg-[#BE123C] text-white rounded-full h-12"
            data-testid="book-now-btn"
          >
            <Calendar className="w-5 h-5 mr-2" />
            Book Now
          </Button>

          <BookingForm 
            isOpen={isBookingModalOpen} 
            onClose={() => setIsBookingModalOpen(false)} 
            service={service} 
            user={user} 
            onConfirm={confirmBooking} 
          />
        </div>
      </div>
    </div>
  );
}
