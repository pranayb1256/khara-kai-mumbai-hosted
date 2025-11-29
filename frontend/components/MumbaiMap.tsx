'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, AlertTriangle, CheckCircle, XCircle, Loader2, TrendingUp, Eye } from 'lucide-react';
import { Claim } from '@/lib/api';

interface MumbaiMapProps {
  claims: Claim[];
  onClaimClick?: (claim: Claim) => void;
}

// Mumbai area coordinates (approximate center points)
const MUMBAI_AREAS: Record<string, { lat: number; lng: number; name: string }> = {
  'bandra': { lat: 19.0596, lng: 72.8295, name: 'Bandra' },
  'andheri': { lat: 19.1136, lng: 72.8697, name: 'Andheri' },
  'dadar': { lat: 19.0176, lng: 72.8428, name: 'Dadar' },
  'kurla': { lat: 19.0726, lng: 72.8845, name: 'Kurla' },
  'borivali': { lat: 19.2307, lng: 72.8567, name: 'Borivali' },
  'thane': { lat: 19.2183, lng: 72.9781, name: 'Thane' },
  'malad': { lat: 19.1874, lng: 72.8484, name: 'Malad' },
  'goregaon': { lat: 19.1663, lng: 72.8526, name: 'Goregaon' },
  'kandivali': { lat: 19.2045, lng: 72.8525, name: 'Kandivali' },
  'colaba': { lat: 18.9067, lng: 72.8147, name: 'Colaba' },
  'churchgate': { lat: 18.9322, lng: 72.8264, name: 'Churchgate' },
  'cst': { lat: 18.9398, lng: 72.8355, name: 'CST' },
  'parel': { lat: 18.9932, lng: 72.8376, name: 'Parel' },
  'worli': { lat: 19.0096, lng: 72.8175, name: 'Worli' },
  'matunga': { lat: 19.0274, lng: 72.8544, name: 'Matunga' },
  'sion': { lat: 19.0420, lng: 72.8644, name: 'Sion' },
  'chembur': { lat: 19.0622, lng: 72.8976, name: 'Chembur' },
  'ghatkopar': { lat: 19.0866, lng: 72.9081, name: 'Ghatkopar' },
  'mulund': { lat: 19.1726, lng: 72.9565, name: 'Mulund' },
  'powai': { lat: 19.1176, lng: 72.9060, name: 'Powai' },
  'vikhroli': { lat: 19.1166, lng: 72.9304, name: 'Vikhroli' },
  'santacruz': { lat: 19.0830, lng: 72.8410, name: 'Santacruz' },
  'vile parle': { lat: 19.0993, lng: 72.8443, name: 'Vile Parle' },
  'juhu': { lat: 19.1075, lng: 72.8263, name: 'Juhu' },
  'versova': { lat: 19.1383, lng: 72.8172, name: 'Versova' },
  'oshiwara': { lat: 19.1378, lng: 72.8384, name: 'Oshiwara' },
  'jogeshwari': { lat: 19.1370, lng: 72.8497, name: 'Jogeshwari' },
  'lokhandwala': { lat: 19.1412, lng: 72.8307, name: 'Lokhandwala' },
  'lower parel': { lat: 18.9985, lng: 72.8259, name: 'Lower Parel' },
  'bkc': { lat: 19.0658, lng: 72.8693, name: 'BKC' },
  'wadala': { lat: 19.0162, lng: 72.8639, name: 'Wadala' },
  'mahim': { lat: 19.0368, lng: 72.8404, name: 'Mahim' },
  'mumbai central': { lat: 18.9712, lng: 72.8197, name: 'Mumbai Central' },
  'grant road': { lat: 18.9631, lng: 72.8186, name: 'Grant Road' },
  'marine lines': { lat: 18.9432, lng: 72.8235, name: 'Marine Lines' },
  'gateway': { lat: 18.9220, lng: 72.8347, name: 'Gateway of India' },
  'nariman point': { lat: 18.9254, lng: 72.8237, name: 'Nariman Point' },
  'western express': { lat: 19.1100, lng: 72.8500, name: 'Western Express Highway' },
  'eastern express': { lat: 19.0800, lng: 72.9200, name: 'Eastern Express Highway' },
  'harbour line': { lat: 19.0300, lng: 72.8800, name: 'Harbour Line' },
  'central line': { lat: 19.0500, lng: 72.8700, name: 'Central Line' },
  'western line': { lat: 19.1000, lng: 72.8400, name: 'Western Line' },
  'metro': { lat: 19.1200, lng: 72.8600, name: 'Metro Line' },
  'local train': { lat: 19.0600, lng: 72.8500, name: 'Local Train' },
};

// Extract location from claim text
function extractLocation(text: string): { area: string; coords: { lat: number; lng: number } } | null {
  const lowerText = text.toLowerCase();
  
  for (const [key, value] of Object.entries(MUMBAI_AREAS)) {
    if (lowerText.includes(key) || lowerText.includes(value.name.toLowerCase())) {
      return { area: value.name, coords: { lat: value.lat, lng: value.lng } };
    }
  }
  
  // Default to central Mumbai if no specific area found
  return null;
}

// SVG Map boundaries (simplified Mumbai shape)
const MAP_BOUNDS = {
  minLat: 18.88,
  maxLat: 19.28,
  minLng: 72.78,
  maxLng: 73.02,
};

function latLngToSvg(lat: number, lng: number, width: number, height: number) {
  const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * width;
  const y = height - ((lat - MAP_BOUNDS.minLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * height;
  return { x, y };
}

export function MumbaiMap({ claims, onClaimClick }: MumbaiMapProps) {
  const [hoveredClaim, setHoveredClaim] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  
  const width = 400;
  const height = 500;

  // Group claims by location
  const claimsByLocation = useMemo(() => {
    const grouped: Record<string, { coords: { lat: number; lng: number }; claims: Claim[]; area: string }> = {};
    
    claims.forEach(claim => {
      const location = extractLocation(claim.text);
      if (location) {
        const key = location.area;
        if (!grouped[key]) {
          grouped[key] = { coords: location.coords, claims: [], area: location.area };
        }
        grouped[key].claims.push(claim);
      }
    });
    
    return grouped;
  }, [claims]);

  // Calculate hotspots (areas with most claims)
  const hotspots = useMemo(() => {
    return Object.entries(claimsByLocation)
      .map(([area, data]) => ({
        area,
        ...data,
        count: data.claims.length,
        hasContradicted: data.claims.some(c => c.status === 'contradicted'),
        hasConfirmed: data.claims.some(c => c.status === 'confirmed'),
        hasPending: data.claims.some(c => c.status === 'pending' || c.status === 'in_progress'),
      }))
      .sort((a, b) => b.count - a.count);
  }, [claimsByLocation]);

  const getMarkerColor = (hotspot: typeof hotspots[0]) => {
    if (hotspot.hasContradicted) return '#EF4444'; // Red for misinformation
    if (hotspot.hasConfirmed) return '#10B981'; // Green for confirmed
    if (hotspot.hasPending) return '#3B82F6'; // Blue for pending
    return '#F59E0B'; // Amber for uncertain
  };

  const getMarkerSize = (count: number) => {
    if (count >= 5) return 20;
    if (count >= 3) return 16;
    return 12;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Mumbai Misinformation Map</h3>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              Misinformation
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              Verified
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              Checking
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* SVG Map */}
        <div className="relative flex-1 p-4">
          <svg 
            viewBox={`0 0 ${width} ${height}`} 
            className="w-full h-auto max-h-[500px]"
            style={{ background: 'linear-gradient(180deg, #E0F2FE 0%, #DBEAFE 100%)' }}
          >
            {/* Mumbai outline (simplified) */}
            <path
              d="M50,450 Q30,400 40,350 Q50,300 60,250 Q80,200 100,150 Q130,100 180,80 Q230,60 280,70 Q320,80 350,120 Q370,160 360,220 Q350,280 340,340 Q330,380 310,420 Q280,460 240,480 Q180,490 120,480 Q70,470 50,450 Z"
              fill="#f8fafc"
              stroke="#cbd5e1"
              strokeWidth="2"
            />
            
            {/* Water (Arabian Sea) */}
            <text x="20" y="250" fill="#60a5fa" fontSize="12" fontWeight="500" opacity="0.6">
              Arabian Sea
            </text>

            {/* Railway lines */}
            <line x1="180" y1="480" x2="200" y2="80" stroke="#9ca3af" strokeWidth="2" strokeDasharray="5,5" opacity="0.5" />
            <line x1="200" y1="480" x2="300" y2="150" stroke="#9ca3af" strokeWidth="2" strokeDasharray="5,5" opacity="0.5" />

            {/* Hotspot markers */}
            {hotspots.map((hotspot) => {
              const { x, y } = latLngToSvg(hotspot.coords.lat, hotspot.coords.lng, width, height);
              const size = getMarkerSize(hotspot.count);
              const color = getMarkerColor(hotspot);
              const isHovered = hoveredClaim === hotspot.area || selectedArea === hotspot.area;

              return (
                <g key={hotspot.area}>
                  {/* Pulse animation for active hotspots */}
                  {hotspot.hasPending && (
                    <circle
                      cx={x}
                      cy={y}
                      r={size + 8}
                      fill={color}
                      opacity="0.3"
                      className="animate-ping"
                    />
                  )}
                  
                  {/* Main marker */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? size + 4 : size}
                    fill={color}
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHoveredClaim(hotspot.area)}
                    onMouseLeave={() => setHoveredClaim(null)}
                    onClick={() => setSelectedArea(selectedArea === hotspot.area ? null : hotspot.area)}
                  />
                  
                  {/* Count badge */}
                  {hotspot.count > 1 && (
                    <text
                      x={x}
                      y={y + 4}
                      textAnchor="middle"
                      fill="white"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {hotspot.count}
                    </text>
                  )}

                  {/* Area label on hover */}
                  {isHovered && (
                    <g>
                      <rect
                        x={x - 40}
                        y={y - size - 25}
                        width="80"
                        height="20"
                        rx="4"
                        fill="rgba(0,0,0,0.8)"
                      />
                      <text
                        x={x}
                        y={y - size - 11}
                        textAnchor="middle"
                        fill="white"
                        fontSize="11"
                        fontWeight="500"
                      >
                        {hotspot.area}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Hotspots List */}
        <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-gray-100 p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Active Hotspots
          </h4>
          
          {hotspots.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No location-specific claims yet
            </p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {hotspots.slice(0, 10).map((hotspot) => (
                <motion.button
                  key={hotspot.area}
                  onClick={() => setSelectedArea(selectedArea === hotspot.area ? null : hotspot.area)}
                  className={`w-full text-left p-2 rounded-lg border transition-all ${
                    selectedArea === hotspot.area
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-900">{hotspot.area}</span>
                    <span className="text-xs text-gray-500">{hotspot.count} claims</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {hotspot.hasContradicted && (
                      <XCircle className="w-3 h-3 text-red-500" />
                    )}
                    {hotspot.hasConfirmed && (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    )}
                    {hotspot.hasPending && (
                      <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Area Details */}
      <AnimatePresence>
        {selectedArea && claimsByLocation[selectedArea] && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-100 bg-gray-50 overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">
                  Claims in {selectedArea}
                </h4>
                <button
                  onClick={() => setSelectedArea(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {claimsByLocation[selectedArea].claims.map((claim) => (
                  <div
                    key={claim.id}
                    onClick={() => onClaimClick?.(claim)}
                    className="p-2 bg-white rounded-lg border border-gray-100 cursor-pointer hover:border-blue-200 transition-colors"
                  >
                    <p className="text-sm text-gray-700 line-clamp-2">{claim.text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        claim.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        claim.status === 'contradicted' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {claim.status}
                      </span>
                      {claim.confidence > 0 && (
                        <span className="text-xs text-gray-500">
                          {Math.round(claim.confidence * 100)}% confidence
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
