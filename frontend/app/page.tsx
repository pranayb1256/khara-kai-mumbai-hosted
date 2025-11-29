'use client';

import React, { useState, useEffect } from 'react';
import { ClaimForm } from '@/components/ClaimForm';
import { ClaimFeed } from '@/components/ClaimFeed';
import { ClaimDetail } from '@/components/ClaimDetail';
import { InteractiveMumbaiMap } from '@/components/InteractiveMumbaiMap';
import { ToastProvider } from '@/components/Toast';
import { 
  ShieldCheck, 
  Github, 
  Twitter, 
  TrendingUp, 
  AlertTriangle, 
  Radio, 
  Zap, 
  MessageCircle,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  Bell,
  Settings,
  Search,
  Filter,
  RefreshCw,
  Map,
  List
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getClaims, Claim } from '@/lib/api';
import { FlipWords } from '@/components/ui/flip-words';

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const handleClaimSubmitted = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Fetch claims
  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const data = await getClaims();
        setClaims(data || []);
        // Auto-select first claim if none selected
        if (data && data.length > 0 && !selectedClaim) {
          setSelectedClaim(data[0]);
        }
      } catch (err) {
        console.error('Failed to fetch claims', err);
      } finally {
        setLoading(false);
      }
    };
    fetchClaims();
    const interval = setInterval(fetchClaims, 15000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  // Stats
  const stats = {
    total: claims.length,
    verified: claims.filter(c => ['verified', 'confirmed'].includes(c.status)).length,
    debunked: claims.filter(c => ['debunked', 'contradicted'].includes(c.status)).length,
    pending: claims.filter(c => ['pending', 'in_progress'].includes(c.status)).length,
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50 font-sans">
        {/* Top Navigation Bar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-[1800px] mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              {/* Logo & Brand */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-linear-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                    Khara Kai <span className="text-orange-500">Mumbai</span>
                  </h1>
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                    Crisis Verification Dashboard
                  </p>
                </div>
              </div>

              {/* Center - Live Status */}
              <div className="hidden md:flex items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-full">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                  <span className="text-sm font-semibold text-orange-700">LIVE</span>
                  <span className="text-sm text-orange-600">•</span>
                  <span className="text-sm text-gray-600">{stats.total} claims tracked</span>
                </div>
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-500 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors">
                  <Bell className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-500 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors">
                  <Settings className="w-5 h-5" />
                </button>
                <a 
                  href="https://github.com/pranayb1256/khar-ka-mumbai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Github className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

          {/* Alert Banner */}
          <div className="bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 text-white py-2 px-4">
            <div className="max-w-[1800px] mx-auto flex items-center justify-center gap-2 text-sm font-medium">
              <Radio className="w-4 h-4 animate-pulse" />
              <span>Mumbai&apos;s Reality Check — Combating misinformation during</span>
              <FlipWords 
                words={["floods", "accidents", "crises", "emergencies"]} 
                className="font-bold text-white"
                duration={2500}
              />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-[1800px] mx-auto px-4 sm:px-6 py-6">
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-gray-600" />
                </div>
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500 mt-1">Claims tracked</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-5 border border-green-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-xs font-medium text-green-600 uppercase tracking-wider">Confirmed</span>
              </div>
              <p className="text-3xl font-bold text-green-600">{stats.verified}</p>
              <p className="text-sm text-gray-500 mt-1">Verified true</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-5 border border-red-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <span className="text-xs font-medium text-red-600 uppercase tracking-wider">Contradicted</span>
              </div>
              <p className="text-3xl font-bold text-red-600">{stats.debunked}</p>
              <p className="text-sm text-gray-500 mt-1">Debunked</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-5 border border-amber-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <span className="text-xs font-medium text-amber-600 uppercase tracking-wider">Pending</span>
              </div>
              <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
              <p className="text-sm text-gray-500 mt-1">Processing</p>
            </motion.div>
          </div>

          {/* Submit Claim Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-6 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-bold">Submit Claim for Verification</h2>
                  <p className="text-gray-400 text-xs">Paste a rumor, news, or WhatsApp forward</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs font-semibold rounded-full">AI Powered</span>
              </div>
            </div>
            <div className="p-6">
              <ClaimForm onClaimSubmitted={handleClaimSubmitted} />
            </div>
          </motion.div>

          {/* View Mode Toggle */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Claims Overview</h2>
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'list' 
                    ? 'bg-white text-orange-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-4 h-4" />
                List View
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'map' 
                    ? 'bg-white text-orange-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Map className="w-4 h-4" />
                Map View
              </button>
            </div>
          </div>

          {/* Conditional View: List or Map */}
          {viewMode === 'map' ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <InteractiveMumbaiMap 
                claims={claims} 
                onClaimClick={setSelectedClaim}
                selectedClaimId={selectedClaim?.id}
              />
            </motion.div>
          ) : (
          /* Two Column Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column - Claims List */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="lg:col-span-5 xl:col-span-4"
            >
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden sticky top-32">
                {/* List Header */}
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-orange-500" />
                      Live Claims
                    </h3>
                    <button 
                      onClick={() => setRefreshKey(k => k + 1)}
                      className="p-2 text-gray-500 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search claims..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Claims List */}
                <div className="max-h-[calc(100vh-400px)] overflow-y-auto p-4">
                  <ClaimFeed 
                    keyProp={refreshKey}
                    selectedClaim={selectedClaim}
                    onClaimSelect={setSelectedClaim}
                  />
                </div>
              </div>
            </motion.div>

            {/* Right Column - Claim Detail */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="lg:col-span-7 xl:col-span-8"
            >
              <AnimatePresence mode="wait">
                {selectedClaim ? (
                  <ClaimDetail key={selectedClaim.id} claim={selectedClaim} />
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center"
                  >
                    <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <ShieldCheck className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Select a claim to analyze</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                      Click on any claim from the list to view detailed analysis, evidence, and verification status.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
          )}

          {/* WhatsApp CTA */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-8 bg-gradient-to-r from-gray-900 to-black rounded-2xl p-8 text-white relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30">
                  <MessageCircle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Verify via WhatsApp</h3>
                  <p className="text-gray-400 text-sm">Forward suspicious messages for instant fact-checking</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <a
                  href="https://wa.me/14155238886?text=hi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-orange-500/25"
                >
                  <MessageCircle className="w-5 h-5" />
                  Open WhatsApp
                </a>
                <span className="text-gray-500 text-sm hidden md:block">
                  +1 415 523 8886
                </span>
              </div>
            </div>
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-12">
          <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm text-gray-600">
                  © {new Date().getFullYear()} Khara Kai Mumbai. Mumbai&apos;s Reality Check.
                </span>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-xs text-gray-400">Powered by AI • EN • हिं • मरा</span>
                <div className="flex items-center gap-2">
                  <a href="https://github.com/pranayb1256/khar-ka-mumbai" target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <Github className="w-4 h-4" />
                  </a>
                  <a href="https://twitter.com/KharaKaiMumbai" target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <Twitter className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </ToastProvider>
  );
}
