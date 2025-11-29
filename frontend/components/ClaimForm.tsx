'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Search, Image, X, AlertCircle, CheckCircle } from 'lucide-react';
import { submitClaim } from '@/lib/api';

interface ClaimFormProps {
  onClaimSubmitted: () => void;
}

const MIN_CHARS = 10;
const MAX_CHARS = 2000;

export const ClaimForm: React.FC<ClaimFormProps> = ({ onClaimSubmitted }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageInput, setImageInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charCount = text.length;
  const isValidLength = charCount >= MIN_CHARS && charCount <= MAX_CHARS;
  const canSubmit = text.trim().length >= MIN_CHARS && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await submitClaim(text, imageUrls);
      setText('');
      setImageUrls([]);
      setSuccess(true);
      onClaimSubmitted();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to submit claim', err);
      setError(err instanceof Error ? err.message : 'Failed to submit claim. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addImageUrl = () => {
    const url = imageInput.trim();
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      if (!imageUrls.includes(url)) {
        setImageUrls([...imageUrls, url]);
      }
      setImageInput('');
    }
  };

  const removeImageUrl = (url: string) => {
    setImageUrls(imageUrls.filter(u => u !== url));
  };

  const exampleClaims = [
    "Local train services suspended between Dadar and Kurla",
    "Heavy rainfall expected in Mumbai tomorrow",
    "New metro line opening next month",
  ];

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Main Input */}
        <div className="relative group">
          <div className="absolute top-4 left-4 text-gray-400 transition-colors group-focus-within:text-orange-500">
            <Search className="w-5 h-5" />
          </div>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError(null);
            }}
            placeholder="Paste a rumor, news, or WhatsApp forward to verify..."
            className={`w-full pl-12 pr-4 py-4 rounded-xl bg-white border-2 transition-all min-h-[140px] resize-none text-gray-900 text-lg placeholder:text-gray-400 outline-none shadow-sm ${
              error 
                ? 'border-red-300 focus:border-red-500 bg-red-50' 
                : 'border-gray-200 focus:bg-white focus:border-orange-500'
            }`}
            disabled={loading}
            maxLength={MAX_CHARS}
          />
          
          {/* Character count */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <span className={`text-xs font-medium transition-colors ${
              charCount > MAX_CHARS 
                ? 'text-red-500' 
                : charCount < MIN_CHARS 
                  ? 'text-gray-400'
                  : 'text-green-600'
            }`}>
              {charCount}/{MAX_CHARS}
            </span>
          </div>
        </div>

        {/* Example Claims */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-gray-500 font-medium">Try:</span>
          {exampleClaims.map((example, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setText(example)}
              className="text-xs text-orange-600 hover:text-orange-700 hover:underline font-medium"
            >
              {example.slice(0, 40)}...
            </button>
          ))}
        </div>

        {/* Image URLs Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="url"
                value={imageInput}
                onChange={(e) => setImageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addImageUrl();
                  }
                }}
                placeholder="Add image URL (optional)"
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent shadow-sm"
                disabled={loading}
              />
            </div>
            <button
              type="button"
              onClick={addImageUrl}
              disabled={!imageInput.trim()}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors disabled:opacity-50"
            >
              Add
            </button>
          </div>

          {/* Image Preview */}
          <AnimatePresence>
            {imageUrls.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-2"
              >
                {imageUrls.map((url, idx) => (
                  <motion.div
                    key={url}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative group"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                      <img 
                        src={url} 
                        alt={`Image ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="%23f3f4f6"><rect width="64" height="64"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="10">Error</text></svg>';
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImageUrl(url)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Message */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm"
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Claim submitted successfully! Verification in progress...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="space-y-1">
            <p className="text-xs text-gray-500 font-medium flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full border border-gray-200">
                🇬🇧 EN
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full border border-orange-200">
                🇮🇳 हिंदी
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 rounded-full border border-green-200">
                🇮🇳 मराठी
              </span>
            </p>
            <p className="text-[10px] text-gray-400">
              Our AI analyzes claims against trusted sources in seconds
            </p>
          </div>
          
          <button
            type="submit"
            disabled={!canSubmit}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all shadow-lg active:scale-[0.98] ${
              canSubmit
                ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/25'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <span>Verify Now</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
