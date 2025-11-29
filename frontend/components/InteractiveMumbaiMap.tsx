'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Layers,
  CloudRain,
  Train,
  X
} from 'lucide-react';
import { Claim } from '@/lib/api';
import { MumbaiMapSVG, MUMBAI_REGIONS } from './MumbaiMapSVG';

interface InteractiveMumbaiMapProps {
  claims: Claim[];
  onClaimClick?: (claim: Claim) => void;
  selectedClaimId?: string;
}

// Mumbai area name mappings for claim extraction (maps to MUMBAI_REGIONS keys)
const MUMBAI_AREA_MAPPINGS: Record<string, string[]> = {
  'colaba': ['colaba'],
  'fort': ['cst', 'fort', 'vt station', 'victoria terminus'],
  'churchgate': ['churchgate'],
  'marine-lines': ['marine lines', 'marine drive'],
  'girgaon': ['girgaon', 'girgaum', 'chowpatty'],
  'grant-road': ['grant road'],
  'mumbai-central': ['mumbai central'],
  'worli': ['worli', 'worli sea face'],
  'lower-parel': ['lower parel'],
  'parel': ['parel'],
  'dadar': ['dadar'],
  'mahim': ['mahim'],
  'bandra': ['bandra', 'bandstand'],
  'khar': ['khar'],
  'santacruz': ['santacruz', 'santa cruz'],
  'vile-parle': ['vile parle'],
  'andheri': ['andheri'],
  'jogeshwari': ['jogeshwari'],
  'goregaon': ['goregaon'],
  'malad': ['malad'],
  'kandivali': ['kandivali', 'kandivli'],
  'borivali': ['borivali', 'borivli'],
  'kurla': ['kurla'],
  'sion': ['sion'],
  'matunga': ['matunga'],
  'wadala': ['wadala'],
  'chembur': ['chembur'],
  'ghatkopar': ['ghatkopar'],
  'vikhroli': ['vikhroli'],
  'bhandup': ['bhandup'],
  'mulund': ['mulund'],
  'powai': ['powai', 'iit bombay'],
  'bkc': ['bkc', 'bandra kurla complex'],
  'thane': ['thane'],
  'vashi': ['vashi'],
  'nerul': ['nerul'],
  'panvel': ['panvel'],
};

// Extract location and crisis type from claim
function extractClaimInfo(claim: Claim): { 
  areaId: string | null; 
  crisisType: string;
} {
  const lowerText = claim.text.toLowerCase();
  let foundAreaId: string | null = null;
  
  // Try extracted location first
  if (claim.extracted?.location) {
    const extractedLoc = claim.extracted.location.toLowerCase();
    for (const [areaId, aliases] of Object.entries(MUMBAI_AREA_MAPPINGS)) {
      if (aliases.some(alias => extractedLoc.includes(alias))) {
        foundAreaId = areaId;
        break;
      }
    }
  }
  
  // Fallback to text search
  if (!foundAreaId) {
    for (const [areaId, aliases] of Object.entries(MUMBAI_AREA_MAPPINGS)) {
      if (aliases.some(alias => lowerText.includes(alias))) {
        foundAreaId = areaId;
        break;
      }
    }
  }
  
  // Determine crisis type
  let crisisType = 'default';
  if (lowerText.includes('flood') || lowerText.includes('water') || lowerText.includes('rain')) {
    crisisType = 'flood';
  } else if (lowerText.includes('fire') || lowerText.includes('blaze')) {
    crisisType = 'fire';
  } else if (lowerText.includes('accident') || lowerText.includes('crash')) {
    crisisType = 'accident';
  } else if (lowerText.includes('train') || lowerText.includes('local') || lowerText.includes('railway')) {
    crisisType = 'train';
  }
  
  return { areaId: foundAreaId, crisisType };
}

type FilterType = 'all' | 'misinformation' | 'verified' | 'pending' | 'flood' | 'accident' | 'train';

export function InteractiveMumbaiMap({ claims, onClaimClick, selectedClaimId }: InteractiveMumbaiMapProps) {
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  // Group claims by location (area ID)
  const claimsByArea = useMemo(() => {
    const grouped: Record<string, { 
      claims: Claim[]; 
      areaId: string;
      areaName: string;
      crisisTypes: Set<string>;
      statuses: { confirmed: number; contradicted: number; pending: number; uncertain: number };
    }> = {};
    
    claims.forEach(claim => {
      const info = extractClaimInfo(claim);
      if (info.areaId && MUMBAI_REGIONS[info.areaId]) {
        if (!grouped[info.areaId]) {
          grouped[info.areaId] = { 
            claims: [], 
            areaId: info.areaId,
            areaName: MUMBAI_REGIONS[info.areaId].name,
            crisisTypes: new Set(),
            statuses: { confirmed: 0, contradicted: 0, pending: 0, uncertain: 0 }
          };
        }
        grouped[info.areaId].claims.push(claim);
        grouped[info.areaId].crisisTypes.add(info.crisisType);
        
        // Count statuses
        if (['confirmed', 'verified'].includes(claim.status)) {
          grouped[info.areaId].statuses.confirmed++;
        } else if (['contradicted', 'debunked'].includes(claim.status)) {
          grouped[info.areaId].statuses.contradicted++;
        } else if (['pending', 'in_progress'].includes(claim.status)) {
          grouped[info.areaId].statuses.pending++;
        } else {
          grouped[info.areaId].statuses.uncertain++;
        }
      }
    });
    
    return grouped;
  }, [claims]);

  // Apply filters to areas
  const filteredAreas = useMemo(() => {
    return Object.entries(claimsByArea).filter(([, data]) => {
      if (filter === 'all') return true;
      if (filter === 'misinformation') return data.statuses.contradicted > 0;
      if (filter === 'verified') return data.statuses.confirmed > 0;
      if (filter === 'pending') return data.statuses.pending > 0;
      if (filter === 'flood') return data.crisisTypes.has('flood');
      if (filter === 'accident') return data.crisisTypes.has('accident');
      if (filter === 'train') return data.crisisTypes.has('train');
      return true;
    });
  }, [claimsByArea, filter]);

  // Calculate area colors based on claim status
  const areaColors = useMemo(() => {
    const colors: Record<string, string> = {};
    filteredAreas.forEach(([areaId, data]) => {
      // Priority: contradicted > pending > confirmed > uncertain
      if (data.statuses.contradicted > 0) {
        colors[areaId] = '#EF4444'; // Red for misinformation
      } else if (data.statuses.pending > 0) {
        colors[areaId] = '#3B82F6'; // Blue for checking
      } else if (data.statuses.confirmed > 0) {
        colors[areaId] = '#10B981'; // Green for verified
      } else {
        colors[areaId] = '#F59E0B'; // Amber for uncertain
      }
    });
    return colors;
  }, [filteredAreas]);

  // Calculate area opacity based on claim count
  const areaOpacity = useMemo(() => {
    const opacity: Record<string, number> = {};
    const maxClaims = Math.max(...filteredAreas.map(([, d]) => d.claims.length), 1);
    filteredAreas.forEach(([areaId, data]) => {
      opacity[areaId] = 0.4 + (data.claims.length / maxClaims) * 0.6;
    });
    return opacity;
  }, [filteredAreas]);

  // Get hotspots count for stats
  const hotspotsCount = filteredAreas.length;

  // Handle area click
  const handleAreaClick = (areaId: string) => {
    if (selectedArea === areaId) {
      setSelectedArea(null);
    } else {
      setSelectedArea(areaId);
      // If single claim in area, also trigger claim click
      const areaData = claimsByArea[areaId];
      if (areaData?.claims.length === 1 && onClaimClick) {
        onClaimClick(areaData.claims[0]);
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-linear-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Mumbai Crisis Map</h3>
              <p className="text-xs text-gray-500">Real-time misinformation hotspots</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All', icon: Layers },
            { id: 'misinformation', label: 'False', icon: XCircle, color: 'text-red-600' },
            { id: 'verified', label: 'Verified', icon: CheckCircle, color: 'text-green-600' },
            { id: 'pending', label: 'Checking', icon: Loader2, color: 'text-blue-600' },
            { id: 'flood', label: 'Flood', icon: CloudRain, color: 'text-cyan-600' },
            { id: 'train', label: 'Train', icon: Train, color: 'text-purple-600' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as FilterType)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f.id 
                  ? 'bg-orange-100 text-orange-700 border border-orange-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
              }`}
            >
              <f.icon className={`w-3.5 h-3.5 ${f.color || ''}`} />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* SVG Map */}
        <div className="relative flex-1 p-4 min-h-[500px]">
          <MumbaiMapSVG
            onAreaClick={handleAreaClick}
            onAreaHover={setHoveredArea}
            hoveredArea={hoveredArea}
            selectedArea={selectedArea}
            areaColors={areaColors}
            areaOpacity={areaOpacity}
          />

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 border border-gray-200 shadow-sm">
            <div className="text-xs font-semibold text-gray-700 mb-2">Legend</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-gray-600">Misinformation</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-gray-600">Verified True</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-gray-600">Checking</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-gray-600">Uncertain</span>
              </div>
            </div>
          </div>

          {/* Stats overlay */}
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 border border-gray-200 shadow-sm">
            <div className="text-xs font-semibold text-gray-700 mb-2">Active Hotspots</div>
            <div className="text-2xl font-bold text-orange-600">{hotspotsCount}</div>
            <div className="text-xs text-gray-500">{claims.length} total claims</div>
          </div>

          {/* Hovered Area Info */}
          {hoveredArea && claimsByArea[hoveredArea] && (
            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 border border-gray-200 shadow-lg max-w-[200px]">
              <div className="text-sm font-bold text-gray-900 mb-1">
                {claimsByArea[hoveredArea].areaName}
              </div>
              <div className="text-xs text-gray-500">
                {claimsByArea[hoveredArea].claims.length} claim{claimsByArea[hoveredArea].claims.length !== 1 ? 's' : ''}
              </div>
              <div className="flex gap-1 mt-2">
                {claimsByArea[hoveredArea].statuses.contradicted > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-red-100 text-red-700 rounded">
                    {claimsByArea[hoveredArea].statuses.contradicted} false
                  </span>
                )}
                {claimsByArea[hoveredArea].statuses.confirmed > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-green-100 text-green-700 rounded">
                    {claimsByArea[hoveredArea].statuses.confirmed} verified
                  </span>
                )}
                {claimsByArea[hoveredArea].statuses.pending > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded">
                    {claimsByArea[hoveredArea].statuses.pending} checking
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Side Panel - Area Details */}
        <AnimatePresence>
          {selectedArea && claimsByArea[selectedArea] && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-gray-200 bg-gray-50 overflow-hidden"
            >
              <div className="p-4 w-80">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-gray-900">{claimsByArea[selectedArea].areaName}</h4>
                  <button 
                    onClick={() => setSelectedArea(null)}
                    className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                {/* Status breakdown */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-red-50 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-red-600">
                      {claimsByArea[selectedArea].statuses.contradicted}
                    </div>
                    <div className="text-[10px] text-red-500 uppercase font-medium">False</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-green-600">
                      {claimsByArea[selectedArea].statuses.confirmed}
                    </div>
                    <div className="text-[10px] text-green-500 uppercase font-medium">Verified</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {claimsByArea[selectedArea].statuses.pending}
                    </div>
                    <div className="text-[10px] text-blue-500 uppercase font-medium">Checking</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-amber-600">
                      {claimsByArea[selectedArea].statuses.uncertain}
                    </div>
                    <div className="text-[10px] text-amber-500 uppercase font-medium">Uncertain</div>
                  </div>
                </div>

                {/* Claims list */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {claimsByArea[selectedArea].claims.map((claim) => (
                    <button
                      key={claim.id}
                      onClick={() => onClaimClick?.(claim)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        claim.id === selectedClaimId 
                          ? 'bg-orange-50 border-orange-200' 
                          : 'bg-white border-gray-200 hover:border-orange-200'
                      }`}
                    >
                      <p className="text-sm text-gray-900 line-clamp-2 mb-1">{claim.text}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          ['confirmed', 'verified'].includes(claim.status) ? 'bg-green-100 text-green-700' :
                          ['contradicted', 'debunked'].includes(claim.status) ? 'bg-red-100 text-red-700' :
                          ['pending', 'in_progress'].includes(claim.status) ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {claim.status}
                        </span>
                        {claim.confidence && (
                          <span className="text-[10px] text-gray-500">
                            {(claim.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
