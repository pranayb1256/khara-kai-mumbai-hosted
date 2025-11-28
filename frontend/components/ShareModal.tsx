'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Twitter, MessageCircle, Link, Check } from 'lucide-react';
import { Claim } from '@/lib/api';

interface ShareModalProps {
  claim: Claim;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ claim, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'verified': return '✅';
      case 'debunked': return '❌';
      case 'uncertain': return '⚠️';
      default: return '🔍';
    }
  };

  const shareText = `${getStatusEmoji(claim.status)} ${claim.status.toUpperCase()}: "${claim.text.slice(0, 100)}${claim.text.length > 100 ? '...' : ''}"

Verified by Khar Ka Mumbai - AI Fact Checker
${claim.confidence ? `Confidence: ${(claim.confidence * 100).toFixed(0)}%` : ''}`;

  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/claim/${claim.id}` 
    : '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTwitterShare = () => {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(tweetUrl, '_blank');
  };

  const handleWhatsAppShare = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Share Verification</h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Preview */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-700 whitespace-pre-line">{shareText}</p>
              </div>

              {/* Share Buttons */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <button
                  onClick={handleTwitterShare}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 transition-colors group"
                >
                  <Twitter className="w-6 h-6 text-[#1DA1F2] group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium text-gray-700">Twitter</span>
                </button>

                <button
                  onClick={handleWhatsAppShare}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-colors group"
                >
                  <MessageCircle className="w-6 h-6 text-[#25D366] group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium text-gray-700">WhatsApp</span>
                </button>

                <button
                  onClick={handleCopy}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors group"
                >
                  {copied ? (
                    <Check className="w-6 h-6 text-emerald-500 group-hover:scale-110 transition-transform" />
                  ) : (
                    <Copy className="w-6 h-6 text-gray-600 group-hover:scale-110 transition-transform" />
                  )}
                  <span className="text-xs font-medium text-gray-700">
                    {copied ? 'Copied!' : 'Copy'}
                  </span>
                </button>
              </div>

              {/* Link Input */}
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                <Link className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-gray-600 outline-none truncate"
                />
                <button
                  onClick={handleCopy}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
