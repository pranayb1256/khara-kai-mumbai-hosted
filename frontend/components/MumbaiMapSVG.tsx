'use client';

import React from 'react';

interface MumbaiMapSVGProps {
  onAreaClick?: (areaId: string) => void;
  onAreaHover?: (areaId: string | null) => void;
  hoveredArea?: string | null;
  selectedArea?: string | null;
  areaColors?: Record<string, string>;
  areaOpacity?: Record<string, number>;
}

// Mumbai map path data - simplified outline of Greater Mumbai
export const MUMBAI_REGIONS: Record<string, { name: string; path: string; center: { x: number; y: number } }> = {
  // South Mumbai
  'colaba': {
    name: 'Colaba',
    path: 'M 145 580 L 150 590 L 155 600 L 148 610 L 140 605 L 135 595 L 140 585 Z',
    center: { x: 145, y: 595 }
  },
  'fort': {
    name: 'Fort / CST',
    path: 'M 140 555 L 155 560 L 160 575 L 150 585 L 140 580 L 135 565 Z',
    center: { x: 147, y: 570 }
  },
  'churchgate': {
    name: 'Churchgate',
    path: 'M 125 545 L 140 550 L 145 565 L 135 575 L 120 565 L 118 555 Z',
    center: { x: 130, y: 558 }
  },
  'marine-lines': {
    name: 'Marine Lines',
    path: 'M 115 520 L 130 525 L 135 545 L 125 555 L 110 545 L 108 530 Z',
    center: { x: 120, y: 537 }
  },
  'girgaon': {
    name: 'Girgaon',
    path: 'M 120 495 L 140 500 L 145 520 L 135 535 L 115 525 L 112 505 Z',
    center: { x: 128, y: 515 }
  },
  'grant-road': {
    name: 'Grant Road',
    path: 'M 130 470 L 150 475 L 155 495 L 145 510 L 125 500 L 122 480 Z',
    center: { x: 138, y: 490 }
  },
  'mumbai-central': {
    name: 'Mumbai Central',
    path: 'M 140 445 L 160 450 L 165 470 L 155 485 L 135 475 L 132 455 Z',
    center: { x: 148, y: 465 }
  },
  'worli': {
    name: 'Worli',
    path: 'M 100 440 L 130 445 L 135 470 L 115 485 L 90 470 L 92 450 Z',
    center: { x: 110, y: 462 }
  },
  'lower-parel': {
    name: 'Lower Parel',
    path: 'M 145 420 L 170 425 L 175 450 L 165 465 L 140 455 L 138 430 Z',
    center: { x: 155, y: 442 }
  },
  'parel': {
    name: 'Parel',
    path: 'M 155 395 L 180 400 L 185 425 L 175 440 L 150 430 L 148 405 Z',
    center: { x: 165, y: 417 }
  },
  'dadar': {
    name: 'Dadar',
    path: 'M 140 365 L 175 370 L 180 400 L 165 415 L 135 405 L 132 375 Z',
    center: { x: 155, y: 390 }
  },
  'mahim': {
    name: 'Mahim',
    path: 'M 105 370 L 135 375 L 140 400 L 125 415 L 100 405 L 98 380 Z',
    center: { x: 118, y: 392 }
  },
  'bandra': {
    name: 'Bandra',
    path: 'M 85 330 L 125 335 L 135 370 L 115 390 L 80 375 L 78 345 Z',
    center: { x: 105, y: 360 }
  },
  'khar': {
    name: 'Khar',
    path: 'M 90 300 L 125 305 L 130 335 L 115 350 L 85 340 L 83 310 Z',
    center: { x: 105, y: 325 }
  },
  'santacruz': {
    name: 'Santacruz',
    path: 'M 95 265 L 135 270 L 140 305 L 120 320 L 90 310 L 88 275 Z',
    center: { x: 112, y: 292 }
  },
  'vile-parle': {
    name: 'Vile Parle',
    path: 'M 100 230 L 145 235 L 150 270 L 130 285 L 95 275 L 93 240 Z',
    center: { x: 120, y: 257 }
  },
  'andheri': {
    name: 'Andheri',
    path: 'M 90 180 L 160 185 L 170 235 L 145 255 L 85 240 L 82 195 Z',
    center: { x: 125, y: 217 }
  },
  'jogeshwari': {
    name: 'Jogeshwari',
    path: 'M 95 145 L 155 150 L 160 185 L 140 200 L 90 190 L 88 155 Z',
    center: { x: 122, y: 172 }
  },
  'goregaon': {
    name: 'Goregaon',
    path: 'M 100 105 L 165 110 L 170 150 L 150 165 L 95 155 L 93 115 Z',
    center: { x: 130, y: 135 }
  },
  'malad': {
    name: 'Malad',
    path: 'M 105 65 L 175 70 L 180 110 L 160 125 L 100 115 L 98 75 Z',
    center: { x: 138, y: 95 }
  },
  'kandivali': {
    name: 'Kandivali',
    path: 'M 115 30 L 185 35 L 190 70 L 170 85 L 110 75 L 108 40 Z',
    center: { x: 147, y: 57 }
  },
  'borivali': {
    name: 'Borivali',
    path: 'M 125 5 L 195 8 L 200 35 L 180 50 L 120 40 L 118 12 Z',
    center: { x: 157, y: 27 }
  },
  // Central/Eastern suburbs
  'kurla': {
    name: 'Kurla',
    path: 'M 175 350 L 220 355 L 225 390 L 205 405 L 170 395 L 168 360 Z',
    center: { x: 195, y: 377 }
  },
  'sion': {
    name: 'Sion',
    path: 'M 180 385 L 215 390 L 220 420 L 200 435 L 175 425 L 173 395 Z',
    center: { x: 195, y: 410 }
  },
  'matunga': {
    name: 'Matunga',
    path: 'M 165 380 L 190 385 L 195 410 L 180 425 L 160 415 L 158 390 Z',
    center: { x: 175, y: 402 }
  },
  'wadala': {
    name: 'Wadala',
    path: 'M 185 420 L 220 425 L 225 455 L 205 470 L 180 460 L 178 430 Z',
    center: { x: 200, y: 445 }
  },
  'chembur': {
    name: 'Chembur',
    path: 'M 210 390 L 260 395 L 270 440 L 245 460 L 205 445 L 203 400 Z',
    center: { x: 235, y: 425 }
  },
  'ghatkopar': {
    name: 'Ghatkopar',
    path: 'M 200 320 L 255 325 L 265 370 L 240 390 L 195 375 L 193 330 Z',
    center: { x: 225, y: 355 }
  },
  'vikhroli': {
    name: 'Vikhroli',
    path: 'M 210 270 L 265 275 L 275 320 L 250 340 L 205 325 L 203 280 Z',
    center: { x: 237, y: 305 }
  },
  'bhandup': {
    name: 'Bhandup',
    path: 'M 220 220 L 275 225 L 285 270 L 260 290 L 215 275 L 213 230 Z',
    center: { x: 247, y: 255 }
  },
  'mulund': {
    name: 'Mulund',
    path: 'M 230 170 L 290 175 L 300 220 L 275 240 L 225 225 L 223 180 Z',
    center: { x: 260, y: 205 }
  },
  'powai': {
    name: 'Powai',
    path: 'M 195 240 L 235 245 L 245 285 L 225 305 L 190 290 L 188 250 Z',
    center: { x: 215, y: 272 }
  },
  'bkc': {
    name: 'BKC',
    path: 'M 145 330 L 180 335 L 185 365 L 165 380 L 140 370 L 138 340 Z',
    center: { x: 160, y: 355 }
  },
  'thane': {
    name: 'Thane',
    path: 'M 250 120 L 320 125 L 335 180 L 305 205 L 245 185 L 243 130 Z',
    center: { x: 285, y: 160 }
  },
  // Navi Mumbai
  'vashi': {
    name: 'Vashi',
    path: 'M 280 400 L 330 405 L 340 450 L 315 470 L 275 455 L 273 410 Z',
    center: { x: 305, y: 435 }
  },
  'nerul': {
    name: 'Nerul',
    path: 'M 300 450 L 350 455 L 360 500 L 335 520 L 295 505 L 293 460 Z',
    center: { x: 325, y: 485 }
  },
  'panvel': {
    name: 'Panvel',
    path: 'M 320 510 L 380 515 L 395 570 L 365 595 L 315 575 L 313 520 Z',
    center: { x: 352, y: 550 }
  }
};

export function MumbaiMapSVG({ 
  onAreaClick, 
  onAreaHover, 
  hoveredArea, 
  selectedArea,
  areaColors = {},
  areaOpacity = {}
}: MumbaiMapSVGProps) {
  const defaultColor = '#e5e7eb';
  
  return (
    <svg 
      viewBox="0 0 420 620" 
      className="w-full h-full"
      style={{ maxHeight: '600px' }}
    >
      {/* Background - Arabian Sea */}
      <defs>
        <linearGradient id="seaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#bae6fd" />
        </linearGradient>
        <linearGradient id="landGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f3f4f6" />
          <stop offset="100%" stopColor="#e5e7eb" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1" dy="1" stdDeviation="2" floodOpacity="0.15"/>
        </filter>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Sea Background */}
      <rect x="0" y="0" width="420" height="620" fill="url(#seaGradient)" />
      
      {/* Mumbai Coastline outline */}
      <path
        d="M 70 5 
           L 200 8 L 210 15 L 340 20 L 360 50 
           L 380 120 L 395 200 L 400 350 
           L 410 450 L 400 550 L 380 600 L 350 615
           L 280 610 L 220 590 L 180 560 
           L 150 610 L 130 615 L 120 600
           L 115 550 L 100 500 L 85 450
           L 75 380 L 65 300 L 60 200
           L 65 100 L 70 5 Z"
        fill="url(#landGradient)"
        stroke="#d1d5db"
        strokeWidth="1"
        filter="url(#shadow)"
      />
      
      {/* Region paths */}
      {Object.entries(MUMBAI_REGIONS).map(([id, region]) => {
        const isHovered = hoveredArea === id;
        const isSelected = selectedArea === id;
        const color = areaColors[id] || defaultColor;
        const opacity = areaOpacity[id] || 0.7;
        
        return (
          <g key={id}>
            <path
              d={region.path}
              fill={color}
              fillOpacity={isHovered || isSelected ? 1 : opacity}
              stroke={isSelected ? '#FF6B00' : isHovered ? '#666' : '#9ca3af'}
              strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1}
              className="cursor-pointer transition-all duration-200"
              filter={isSelected ? 'url(#glow)' : undefined}
              onClick={() => onAreaClick?.(id)}
              onMouseEnter={() => onAreaHover?.(id)}
              onMouseLeave={() => onAreaHover?.(null)}
            />
            {/* Area label */}
            {(isHovered || isSelected) && (
              <text
                x={region.center.x}
                y={region.center.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[8px] font-bold fill-gray-800 pointer-events-none"
                style={{ textShadow: '0 0 3px white, 0 0 3px white' }}
              >
                {region.name}
              </text>
            )}
          </g>
        );
      })}
      
      {/* Major landmarks/labels */}
      <g className="pointer-events-none">
        {/* Sea label */}
        <text x="30" y="300" className="text-[10px] fill-blue-400 italic">
          Arabian
        </text>
        <text x="35" y="315" className="text-[10px] fill-blue-400 italic">
          Sea
        </text>
        
        {/* Thane Creek label */}
        <text x="300" y="300" className="text-[8px] fill-blue-400 italic" transform="rotate(45, 300, 300)">
          Thane Creek
        </text>
      </g>
      
      {/* Railway lines */}
      <g stroke="#666" strokeWidth="1.5" strokeDasharray="4,2" opacity="0.4">
        {/* Western Line */}
        <path d="M 157 27 L 138 95 L 130 135 L 122 172 L 125 217 L 120 257 L 112 292 L 105 325 L 105 360 L 118 392 L 155 390 L 165 417 L 155 442 L 148 465 L 138 490 L 128 515 L 120 537 L 130 558 L 147 570 L 145 595" fill="none" />
        {/* Central Line */}
        <path d="M 285 160 L 260 205 L 247 255 L 237 305 L 225 355 L 195 377 L 175 402 L 195 410 L 200 445" fill="none" />
        {/* Harbour Line */}
        <path d="M 200 445 L 235 425 L 305 435 L 325 485 L 352 550" fill="none" />
      </g>
    </svg>
  );
}

export default MumbaiMapSVG;
