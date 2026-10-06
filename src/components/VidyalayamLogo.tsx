import React, { useState } from 'react';

interface VidyalayamLogoProps {
  size?: number | string;
  className?: string;
  glow?: boolean;
  showText?: boolean;
  subtitle?: string;
  creatorTag?: boolean;
  priority?: boolean;
}

/**
 * Official Vidyalayam Brand Logo
 * Features the signature papercraft Schoolhouse on Open Book emblem
 * with fluttering pennant flag, radiant golden sun rays, and arched entryway,
 * matching the official appstore.png artwork.
 */
export const VidyalayamLogo: React.FC<VidyalayamLogoProps> = ({
  size = 40,
  className = '',
  glow = false,
  showText = false,
  subtitle,
  creatorTag = true,
}) => {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Icon Emblem Container */}
      <div
        className={`relative shrink-0 flex items-center justify-center transition-transform ${
          glow ? 'hover:scale-105 duration-200' : ''
        }`}
        style={{ width: pixelSize, height: pixelSize }}
      >
        {glow && (
          <div
            className="absolute -inset-1 rounded-2xl bg-[#9d512d]/20 blur-md pointer-events-none animate-pulse"
            aria-hidden="true"
          />
        )}

        {/* Clean High-Resolution Vector SVG - Warm Parchment & Terracotta, Never Dark */}
        <svg
          viewBox="0 0 512 512"
          width="100%"
          height="100%"
          className="relative z-10 drop-shadow-sm rounded-[22%] border border-[#e2d8cb]/80 dark:border-white/10"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="vl-bg-grad" cx="50%" cy="46%" r="65%">
              <stop offset="0%" stopColor="#fbf6ee" />
              <stop offset="60%" stopColor="#f3e8d7" />
              <stop offset="100%" stopColor="#e8d8be" />
            </radialGradient>
            <filter id="vl-shadow-book" x="-20%" y="-20%" width="140%" height="150%">
              <feDropShadow dx="0" dy="10" stdDeviation="6" floodColor="#421f0b" floodOpacity="0.3" />
            </filter>
            <filter id="vl-shadow-deep" x="-15%" y="-15%" width="130%" height="135%">
              <feDropShadow dx="0" dy="7" stdDeviation="5" floodColor="#3d1b08" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Base Warm Parchment Canvas (Light and Radiant) */}
          <rect width="512" height="512" rx="104" fill="url(#vl-bg-grad)" />

          {/* Emblem (Centered) */}
          <g id="school-emblem" transform="translate(0, 18)">
            {/* 1. Open Book Base */}
            <path
              d="M 88 288 C 160 262 216 270 256 324 C 296 270 352 262 424 288 C 430 298 424 308 418 314 C 350 284 296 290 256 348 C 216 290 162 284 94 314 C 88 308 82 298 88 288 Z"
              fill="#a64d1f"
              filter="url(#vl-shadow-book)"
            />
            <path
              d="M 92 308 C 162 280 216 286 256 342 C 296 286 350 280 420 308 L 416 316 C 350 288 296 294 256 352 C 216 294 162 288 96 316 Z"
              fill="#692d0f"
            />
            <path
              d="M 94 280 C 164 254 218 262 256 318 C 294 262 348 254 418 280 L 414 298 C 348 272 296 278 256 336 C 216 278 164 272 98 298 Z"
              fill="#dd8a46"
            />
            <path
              d="M 112 248 C 172 244 220 254 256 288 C 292 254 340 244 400 248 L 410 274 C 344 254 296 268 256 322 C 216 268 168 254 102 274 Z"
              fill="#fefcf8"
              filter="url(#vl-shadow-deep)"
            />
            <path d="M 256 288 L 256 336" stroke="#94481f" strokeWidth="3.5" strokeLinecap="round" />

            {/* 2. Schoolhouse Walls */}
            <rect x="146" y="196" width="60" height="64" fill="#eedec8" />
            <rect x="306" y="196" width="60" height="64" fill="#eedec8" />
            <rect x="200" y="146" width="112" height="126" fill="#f8f1e7" />
            <polygon points="200,146 256,104 312,146" fill="#f8f1e7" />

            {/* 3. Roofs */}
            <polygon points="256,92 324,146 314,152 256,108 198,152 188,146" fill="#5c2912" />
            <polygon points="256,96 320,146 312,152 256,110 200,152 192,146" fill="#8c4423" />
            <polygon points="134,204 204,166 208,174 142,210" fill="#5c2912" />
            <polygon points="136,204 204,168 206,174 142,208" fill="#8c4423" />
            <polygon points="378,204 308,166 304,174 370,210" fill="#5c2912" />
            <polygon points="376,204 308,168 306,174 370,208" fill="#8c4423" />

            {/* 4. Flagpole & Flag */}
            <rect x="254" y="66" width="4" height="30" rx="2" fill="#4d210d" />
            <path d="M 258 68 C 274 66 284 74 294 70 L 294 86 C 284 82 274 90 258 84 Z" fill="#692d0f" />

            {/* 5. Arched Windows */}
            <path d="M 160 234 L 160 215 C 160 210 164 206 169 206 C 174 206 178 210 178 215 L 178 234 Z" fill="#5c2912" />
            <path d="M 184 234 L 184 215 C 184 210 188 206 193 206 C 198 206 202 210 202 215 L 202 234 Z" fill="#5c2912" />
            <path d="M 310 234 L 310 215 C 310 210 314 206 319 206 C 324 206 328 210 328 215 L 328 234 Z" fill="#5c2912" />
            <path d="M 334 234 L 334 215 C 334 210 338 206 343 206 C 348 206 352 210 352 215 L 352 234 Z" fill="#5c2912" />

            {/* 6. Sun Motif & Entryway */}
            <circle cx="256" cy="154" r="16" fill="#c8672e" />
            <rect x="254" y="130" width="4" height="6" rx="2" fill="#8c4423" />
            <rect x="254" y="172" width="4" height="6" rx="2" fill="#8c4423" />
            <rect x="232" y="152" width="6" height="4" rx="2" fill="#8c4423" />
            <rect x="274" y="152" width="6" height="4" rx="2" fill="#8c4423" />
            <rect x="244" y="186" width="24" height="5" rx="2.5" fill="#5c2912" />
            <path d="M 240 254 L 240 210 C 240 200 248 194 256 194 C 264 194 272 200 272 210 L 272 254 Z" fill="#4d210d" />
          </g>
        </svg>
      </div>

      {/* Typography Brand Block */}
      {showText && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-[#141d24] dark:text-[#e4ded6] leading-none">
              Vidyalayam
            </h1>
            <span className="text-xs font-semibold text-[#9d512d] dark:text-[#f59c73] font-gujarati">
              (વિદ્યાલયમ)
            </span>
          </div>
          {subtitle ? (
            <p className="text-[11px] text-[#635848] dark:text-[#a99f91] truncate font-medium mt-0.5">
              {subtitle}
            </p>
          ) : creatorTag ? (
            <p className="text-[10px] sm:text-[11px] text-[#9d512d] dark:text-[#f59c73] font-bold tracking-wide truncate mt-0.5">
              by NRChad
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
};
