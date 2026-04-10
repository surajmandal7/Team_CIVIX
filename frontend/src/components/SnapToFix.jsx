import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, X, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SnapToFix({ isOpen, onClose }) {
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState('');
  const [description, setDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Image size should be less than 10MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target.result);
        // Extract base64 without the data URL prefix
        const base64 = e.target.result.split(',')[1];
        setImageBase64(base64);
        setError(null);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!imageBase64) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/api/ai/snap-to-fix`, {
        image_base64: imageBase64,
        description: description
      });

      setResult(response.data);
    } catch (err) {
      setError('Failed to analyze image. Please try again.');
      console.error('Snap to fix error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFindServices = () => {
    if (result?.service_category) {
      navigate(`/services?category=${result.service_category}${result.urgency === 'high' ? '&emergency=true' : ''}`);
      onClose();
    }
  };

  const resetState = () => {
    setImage(null);
    setImageBase64('');
    setDescription('');
    setResult(null);
    setError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-cabinet text-xl">
            <Camera className="w-6 h-6 text-[#E23744]" />
            Snap to Fix
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info */}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Upload a photo of your problem and our AI will identify the issue and recommend the right service provider.
          </p>

          {/* Upload Zone */}
          {!image ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="upload-zone cursor-pointer text-center"
              data-testid="upload-zone"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Upload className="w-8 h-8 text-gray-400" />
              </div>
              <p className="font-medium text-gray-700 dark:text-gray-300">
                Click to upload an image
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                PNG, JPG up to 10MB
              </p>
            </div>
          ) : (
            <div className="relative">
              <img
                src={image}
                alt="Uploaded"
                className="w-full h-48 object-cover rounded-xl"
              />
              <button
                onClick={resetState}
                className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            data-testid="file-input"
          />

          {/* Description */}
          {image && !result && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Describe the problem (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Water is leaking from the pipe under the sink..."
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:ring-2 focus:ring-[#E23744] focus:border-transparent resize-none"
                rows={3}
                data-testid="description-input"
              />
            </div>
          )}

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
              >
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-3"
              >
                <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="font-semibold text-green-700 dark:text-green-400">
                      Issue Detected
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    {result.issue_detected}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Category:</span>
                      <p className="font-medium text-gray-800 dark:text-white capitalize">
                        {result.service_category?.replace('_', ' ') || 'General'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Urgency:</span>
                      <p className={`font-medium capitalize ${
                        result.urgency === 'high' ? 'text-red-600' :
                        result.urgency === 'medium' ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {result.urgency}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500 dark:text-gray-400">Estimated Cost:</span>
                      <p className="font-medium text-gray-800 dark:text-white">
                        {result.estimated_cost}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    <strong>Recommendation:</strong> {result.recommended_action}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {!result ? (
              <Button
                onClick={analyzeImage}
                disabled={!image || isAnalyzing}
                className="flex-1 bg-[#E23744] hover:bg-[#BE123C] text-white"
                data-testid="analyze-btn"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze Image'
                )}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={resetState}
                  className="flex-1"
                >
                  Upload Another
                </Button>
                <Button
                  onClick={handleFindServices}
                  className="flex-1 bg-[#E23744] hover:bg-[#BE123C] text-white"
                  data-testid="find-services-btn"
                >
                  Find Services
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
