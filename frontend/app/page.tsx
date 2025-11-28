'use client';

import React, { useState } from 'react';
import { ClaimForm } from '@/components/ClaimForm';
import { ClaimFeed } from '@/components/ClaimFeed';
import { ToastProvider } from '@/components/Toast';
import { ShieldCheck, Sparkles, Github, Twitter, TrendingUp, AlertTriangle, Radio, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleClaimSubmitted = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <ToastProvider>
      <main className="min-h-screen bg-[#FAFAFA] selection:bg-blue-100 selection:text-blue-900">
        {/* Background Decoration */}
        <div className="fixed inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-size-[6rem_4rem]">
          <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_800px_at_100%_200px,#d5c5ff,transparent)]"></div>
        </div>

        {/* Top Banner */}
        <div className="bg-linear-to-r from-blue-600 via-violet-600 to-purple-600 text-white py-2.5 px-4 text-center text-sm font-medium">
          <span className="inline-flex items-center gap-2">
            <Radio className="w-4 h-4 animate-pulse" />
            Mumbai&apos;s Reality Check — When Truth Matters Most
            <span className="hidden sm:inline-flex items-center gap-1 ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
              <Zap className="w-3 h-3" /> Live
            </span>
          </span>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <motion.header 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16 relative"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-blue-400/20 blur-3xl rounded-full" />
            
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex items-center justify-center p-5 bg-white rounded-2xl shadow-lg border border-gray-100 mb-8 relative z-10"
            >
              <ShieldCheck className="w-12 h-12 text-blue-600" />
            </motion.div>
            
            <h1 className="text-5xl sm:text-6xl font-black text-gray-900 mb-4 tracking-tight leading-tight">
              Khara Kai{' '}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 via-violet-600 to-purple-600">
                Mumbai
              </span>
            </h1>
            
            <p className="text-lg text-gray-500 font-medium mb-4">
              🛡️ Real-Time Truth Guardian
            </p>
            
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mb-8">
              Autonomous AI agent combating misinformation during Mumbai&apos;s critical moments — 
              floods, accidents, and crises. Verify before you share!
            </p>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center gap-3 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-gray-200 shadow-sm">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                AI Powered
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-gray-200 shadow-sm">
                ⚡ Real-time Verification
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-gray-200 shadow-sm">
                🌐 EN • हिं • मरा
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-gray-200 shadow-sm">
                🔍 Multi-Source Verification
              </span>
            </div>
          </motion.header>

          {/* Crisis Alert Banner (shown during emergencies) */}
          {/* <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3"
          >
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <p className="font-semibold text-amber-800">Heavy Rain Alert Active</p>
              <p className="text-sm text-amber-700">Extra vigilance on flood-related claims. Verify before sharing!</p>
            </div>
          </motion.div> */}

          <div className="space-y-16">
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative z-10"
            >
              <div className="absolute -inset-1 bg-linear-to-r from-blue-600 to-violet-600 rounded-2xl blur opacity-20" />
              <div className="relative bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-1.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2 px-4">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Submit Claim for Verification
                  </span>
                  <div className="flex-1" />
                  <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-full bg-rose-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                </div>
                <div className="p-6 sm:p-8">
                  <ClaimForm onClaimSubmitted={handleClaimSubmitted} />
                </div>
              </div>
            </motion.section>
            
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <ClaimFeed keyProp={refreshKey} />
            </motion.section>
          </div>

          {/* How It Works Section */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-24 text-center"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-8">How Khara Kai Mumbai Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Radio className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Monitor</h3>
                <p className="text-sm text-gray-600">Tracks Twitter, news sources, and social media for Mumbai-related claims in real-time</p>
              </div>
              <div className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-6 h-6 text-violet-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Verify</h3>
                <p className="text-sm text-gray-600">Cross-references with BMC, Mumbai Police, Railways & official sources using AI</p>
              </div>
              <div className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Alert</h3>
                <p className="text-sm text-gray-600">Delivers fact-checks in English, Hindi & Marathi with actionable guidance</p>
              </div>
            </div>
          </motion.section>

          <footer className="mt-24 text-center pb-8">
            <div className="flex justify-center gap-4 mb-4">
              <a 
                href="https://github.com/pranayb1256/khar-ka-mumbai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a 
                href="https://twitter.com/KharaKaiMumbai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} Khara Kai Mumbai. Mumbai&apos;s Reality Check.
            </p>
            <p className="text-gray-300 text-xs mt-2">
              Autonomous AI Agent • Multilingual • Made with ❤️ for Mumbai
            </p>
          </footer>
        </div>
      </main>
    </ToastProvider>
  );
}
