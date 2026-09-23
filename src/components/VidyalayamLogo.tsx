import React from 'react';

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
 * Features the signature Terracotta Squircle, Sacred Golden Flame,
 * Alabaster Book of Knowledge, and Academic "V" Crest.
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
      {/* SVG Icon Emblem */}
      <div
        className={`relative shrink-0 flex items-center justify-center transition-transform ${
          glow ? 'hover:scale-105 duration-200' : ''
        }`}
        style={{ width: pixelSize, height: pixelSize }}
      >
        {glow && (
          <div
            className="absolute inset-0 rounded-2xl bg-[#9d512d]/30 blur-md pointer-events-none animate-pulse"
            aria-hidden="true"
          />
        )}
        <svg
          viewBox="0 0 512 512"
          width="100%"
          height="100%"
          className="relative z-10 drop-shadow-md rounded-[22%]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="vidya-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9d512d" />
              <stop offset="60%" stopColor="#633119" />
              <stop offset="100%" stopColor="#1a2530" />
            </linearGradient>
            <linearGradient id="vidya-flame-grad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#e8733a" />
              <stop offset="50%" stopColor="#f59c73" />
              <stop offset="100%" stopColor="#fbd38d" />
            </linearGradient>
            <filter id="vidya-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Squircle Base Background */}
          <rect width="512" height="512" rx="128" fill="url(#vidya-bg-grad)" />

          {/* Golden Rim Border */}
          <rect
            x="20"
            y="20"
            width="472"
            height="472"
            rx="112"
            fill="none"
            stroke="#fbd38d"
            strokeWidth="10"
            opacity="0.45"
          />

          {/* Flame Ambient Aura */}
          <circle cx="256" cy="205" r="50" fill="#fbd38d" opacity="0.18" filter="url(#vidya-glow)" />

          {/* Sacred Flame */}
          <path
            d="M 256 110 C 224 155 210 190 216 225 C 224 260 256 268 256 268 C 256 268 288 260 296 225 C 302 190 288 155 256 110 Z"
            fill="url(#vidya-flame-grad)"
          />
          {/* Inner Radiant Core */}
          <circle cx="256" cy="210" r="18" fill="#fff7ed" opacity="0.9" />

          {/* Open Book of Knowledge */}
          {/* Left & Right Pages */}
          <path
            d="M 256 278 C 200 246 136 256 90 278 L 90 388 C 136 366 200 356 256 388 C 312 356 376 366 422 388 L 422 278 C 376 256 312 246 256 278 Z"
            fill="#e4ded6"
          />
          {/* Page Lines (Subtle Knowledge Texture) */}
          <path
            d="M 120 300 C 160 285 210 280 244 295 M 120 326 C 160 311 210 306 244 321 M 120 352 C 160 337 210 332 244 347"
            stroke="#9d512d"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.35"
          />
          <path
            d="M 392 300 C 352 285 302 280 268 295 M 392 326 C 352 311 302 306 268 321 M 392 352 C 352 337 302 332 268 347"
            stroke="#9d512d"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.35"
          />

          {/* Book Spine */}
          <path
            d="M 256 278 L 256 388"
            stroke="#9d512d"
            strokeWidth="9"
            strokeLinecap="round"
          />

          {/* Graduation V Crest (Vidyalayam) */}
          <path
            d="M 166 330 L 256 424 L 346 330"
            fill="none"
            stroke="#9d512d"
            strokeWidth="16"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 166 330 L 256 424 L 346 330"
            fill="none"
            stroke="#fbd38d"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.8"
          />
        </svg>
      </div>

      {/* Typography Brand Block */}
      {showText && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h1 className="text-base sm:text-lg font-black tracking-tight text-[#141d24] dark:text-[#e4ded6] leading-none">
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
            <p className="text-[10px] sm:text-[11px] text-[#9d512d] dark:text-[#f59c73] font-semibold tracking-wide truncate mt-0.5">
              Created by NR Chad
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
};
