import React from 'react';

/**
 * Official Indian National Emblem (State Emblem of India / Ashoka Lion Capital with Satyameva Jayate)
 * High-definition vector SVG representation for official school letterheads and government correspondence.
 */
export const INDIAN_EMBLEM_SVG = `
<svg viewBox="0 0 100 125" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%; display: block;">
  <!-- Crown / Top Lions -->
  <!-- Center Lion -->
  <path d="M44 14 C44 9, 56 9, 56 14 C58 13, 61 16, 59 20 C62 23, 59 28, 56 29 C56 34, 44 34, 44 29 C41 28, 38 23, 41 20 C39 16, 42 13, 44 14 Z" fill="#8B5A2B" stroke="#5C3A1E" stroke-width="0.8" />
  <!-- Center Lion Face & Mane details -->
  <circle cx="47" cy="18" r="1.2" fill="#2D1A0E" />
  <circle cx="53" cy="18" r="1.2" fill="#2D1A0E" />
  <path d="M48.5 21 L51.5 21 L50 23 Z" fill="#2D1A0E" />
  <path d="M47 24 Q50 26 53 24" stroke="#2D1A0E" stroke-width="0.8" fill="none" />
  <!-- Center Lion Torso & Paws -->
  <path d="M46 29 L46 44 L54 44 L54 29 Z" fill="#9C6B3D" stroke="#5C3A1E" stroke-width="0.8" />
  <path d="M47 44 L47 48 L49.5 48 L49.5 44" fill="#8B5A2B" stroke="#5C3A1E" stroke-width="0.6" />
  <path d="M50.5 44 L50.5 48 L53 48 L53 44" fill="#8B5A2B" stroke="#5C3A1E" stroke-width="0.6" />

  <!-- Left Lion (Profile) -->
  <path d="M30 20 C30 15, 39 16, 40 21 C41 24, 41 30, 39 33 C37 36, 32 38, 30 34 C27 32, 26 27, 28 23 C28 21, 29 20, 30 20 Z" fill="#8B5A2B" stroke="#5C3A1E" stroke-width="0.8" />
  <circle cx="31" cy="22" r="1.2" fill="#2D1A0E" />
  <path d="M27 25 Q30 27 33 26" stroke="#2D1A0E" stroke-width="0.8" fill="none" />
  <path d="M34 33 L32 46 L38 46 L39 33 Z" fill="#9C6B3D" stroke="#5C3A1E" stroke-width="0.8" />
  <path d="M32 46 L32 49 L36 49 L36 46" fill="#8B5A2B" stroke="#5C3A1E" stroke-width="0.6" />

  <!-- Right Lion (Profile) -->
  <path d="M70 20 C70 15, 61 16, 60 21 C59 24, 59 30, 61 33 C63 36, 68 38, 70 34 C73 32, 74 27, 72 23 C72 21, 71 20, 70 20 Z" fill="#8B5A2B" stroke="#5C3A1E" stroke-width="0.8" />
  <circle cx="69" cy="22" r="1.2" fill="#2D1A0E" />
  <path d="M73 25 Q70 27 67 26" stroke="#2D1A0E" stroke-width="0.8" fill="none" />
  <path d="M66 33 L68 46 L62 46 L61 33 Z" fill="#9C6B3D" stroke="#5C3A1E" stroke-width="0.8" />
  <path d="M64 46 L64 49 L68 49 L68 46" fill="#8B5A2B" stroke="#5C3A1E" stroke-width="0.6" />

  <!-- Capital Platform / Abacus Base -->
  <path d="M22 50 L78 50 L76 53 L24 53 Z" fill="#B3804D" stroke="#5C3A1E" stroke-width="0.8" />
  <rect x="20" y="53" width="60" height="15" rx="1.5" fill="#C9975D" stroke="#5C3A1E" stroke-width="0.8" />

  <!-- Center Ashoka Chakra on Abacus -->
  <circle cx="50" cy="60.5" r="5.5" fill="#1E3A8A" stroke="#172554" stroke-width="0.8" />
  <circle cx="50" cy="60.5" r="4.8" fill="#FFFFFF" />
  <circle cx="50" cy="60.5" r="1.3" fill="#1E3A8A" />
  <!-- 24 Spokes (simplified clean geometric pattern) -->
  <path d="M50 55.7 L50 65.3 M45.2 60.5 L54.8 60.5 M46.6 57.1 L53.4 63.9 M46.6 63.9 L53.4 57.1 M48.2 55.9 L51.8 65.1 M45.4 58.7 L54.6 62.3 M45.4 62.3 L54.6 58.7 M48.2 65.1 L51.8 55.9" stroke="#1E3A8A" stroke-width="0.45" />

  <!-- Left Galloping Horse on Abacus -->
  <path d="M26 62 Q29 58 32 59 Q35 60 38 57 Q38 60 36 62 Q33 63 32 65 L27 65 Q28 63 26 62 Z" fill="#5C3A1E" />

  <!-- Right Bull on Abacus -->
  <path d="M74 62 Q71 58 68 59 Q65 60 62 57 Q62 60 64 62 Q67 63 68 65 L73 65 Q72 63 74 62 Z" fill="#5C3A1E" />

  <!-- Lotus Base (Inverted Bell) -->
  <path d="M25 68 L75 68 L72 74 L28 74 Z" fill="#B3804D" stroke="#5C3A1E" stroke-width="0.8" />
  <path d="M28 74 C34 83, 66 83, 72 74 Z" fill="#9C6B3D" stroke="#5C3A1E" stroke-width="0.8" />
  <!-- Lotus Petals -->
  <path d="M33 74 Q38 81 43 74" fill="none" stroke="#5C3A1E" stroke-width="0.7" />
  <path d="M43 74 Q50 82 57 74" fill="none" stroke="#5C3A1E" stroke-width="0.7" />
  <path d="M57 74 Q62 81 67 74" fill="none" stroke="#5C3A1E" stroke-width="0.7" />

  <!-- Plinth Lower Base Plate -->
  <rect x="22" y="81" width="56" height="3" rx="0.8" fill="#5C3A1E" />

  <!-- Motto: "सत्यमेव जयते" (Satyameva Jayate) Inscribed in Devanagari -->
  <g id="motto">
    <!-- Top shirorekha line -->
    <line x1="23" y1="89" x2="77" y2="89" stroke="#1E293B" stroke-width="1.1" stroke-linecap="round" />
    <text x="50" y="99" text-anchor="middle" font-family="'Noto Sans Devanagari', 'Sanskrit Text', 'Arial Unicode MS', sans-serif" font-weight="900" font-size="8.8" fill="#0F172A" letter-spacing="1.2">सत्यमेव जयते</text>
  </g>
</svg>
`;

export interface IndianEmblemIconProps {
  className?: string;
  style?: React.CSSProperties;
}

export const IndianEmblemIcon: React.FC<IndianEmblemIconProps> = ({
  className = 'w-14 h-16',
  style,
}) => {
  return (
    <div
      className={`inline-block shrink-0 select-none ${className}`}
      style={style}
      aria-label="Indian National Emblem (Satyameva Jayate)"
      title="ભારતીય રાષ્ટ્રીય પ્રતીક (સત્યમેવ જયતે)"
      dangerouslySetInnerHTML={{ __html: INDIAN_EMBLEM_SVG }}
    />
  );
};

export default IndianEmblemIcon;
