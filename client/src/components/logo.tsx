import React from 'react';
import logoImage from '@assets/Unbuilt_1753129411859.png';
import logoSvg from '@assets/unbuilt-transparent.svg';

import Unbuilt2 from "@assets/Unbuilt2.png";

import UNBUILT from "@assets/Unbuilt.png";

// Using SVG logo for true transparency

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'white' | 'dark';
  showText?: boolean;
}

export default function Logo({ 
  className = '', 
  size = 'md', 
  variant = 'default',
  showText = false 
}: LogoProps) {
  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-32 h-32',
    lg: 'w-40 h-40',
    xl: 'w-48 h-48'
  };

  return (
    <div className={`flex items-center ${className}`}>
      {/* Logo Image - No text needed since it's a text logo */}
      <div className={`${sizeClasses[size]} relative flex-shrink-0 logo-container`}>
        <img 
          src={UNBUILT} 
          alt="Unbuilt - Discover Market Opportunities"
          className="w-full h-full object-contain"
          key="unbuilt-logo-svg"
        />
      </div>
    </div>
  );
}

export function LogoIcon({ className = '', size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-28 h-28',
    xl: 'w-32 h-32'
  };

  return (
    <div className={`${sizeClasses[size]} ${className} flex-shrink-0 logo-container`}>
      <img 
        src={logoSvg} 
        alt="Unbuilt"
        className="w-full h-full object-contain"
        key="unbuilt-icon-svg"
      />
    </div>
  );
}

// Fallback SVG Logo (if image fails to load)
export function LogoSVG({ className = "", size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="flame-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--neon-purple))" />
            <stop offset="33%" stopColor="hsl(var(--neon-pink))" />
            <stop offset="66%" stopColor="hsl(var(--neon-red))" />
            <stop offset="100%" stopColor="hsl(var(--neon-orange))" />
          </linearGradient>
          
          <filter id="flame-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feMorphology operator="dilate" radius="2"/>
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/> 
            </feMerge>
          </filter>
        </defs>
        
        {/* Construction scene with flame effects */}
        <g filter="url(#flame-glow)">
          {/* Cloud base */}
          <ellipse cx="50" cy="65" rx="40" ry="12" fill="url(#flame-logo-gradient)" opacity="0.4"/>
          
          {/* Building structures */}
          <rect x="30" y="35" width="8" height="30" fill="url(#flame-logo-gradient)" rx="2"/>
          <rect x="40" y="25" width="12" height="40" fill="url(#flame-logo-gradient)" rx="3"/>
          <rect x="54" y="30" width="10" height="35" fill="url(#flame-logo-gradient)" rx="2"/>
          
          {/* Crane structure */}
          <rect x="68" y="15" width="4" height="50" fill="url(#flame-logo-gradient)"/>
          <rect x="50" y="15" width="25" height="3" fill="url(#flame-logo-gradient)"/>
          
          {/* Hook and cable */}
          <line x1="72" y1="18" x2="72" y2="35" stroke="url(#flame-logo-gradient)" strokeWidth="2"/>
          <circle cx="72" cy="37" r="3" fill="url(#flame-logo-gradient)"/>
        </g>
        
        {/* Floating construction elements */}
        <g className="animate-float">
          <rect x="15" y="25" width="4" height="4" fill="hsl(var(--neon-orange))" opacity="0.7" rx="1"/>
          <circle cx="85" cy="40" r="2" fill="hsl(var(--neon-pink))" opacity="0.6"/>
          <polygon points="20,50 24,54 20,58 16,54" fill="hsl(var(--neon-purple))" opacity="0.5"/>
        </g>
      </svg>
    </div>
  );
}