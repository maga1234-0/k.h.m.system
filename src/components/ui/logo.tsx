import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className, size = 100 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Arrière-plan optionnel pour le contraste */}
      <circle cx="50" cy="50" r="48" fill="white" fillOpacity="0.05" />
      
      {/* Tours stylisées (Tours ImaraPMS) */}
      <path d="M30 80V35L40 25V80H30Z" fill="currentColor" />
      <path d="M70 80V35L60 25V80H70Z" fill="currentColor" />
      
      {/* Pont de connexion hôtelier */}
      <path d="M40 45C40 45 45 40 50 40C55 40 60 45 60 45V60C60 60 55 65 50 65C45 65 40 60 40 60V45Z" fill="currentColor" opacity="0.9" />
      
      {/* Symbole de la serrure (Hospitalité Sécurisée) */}
      <circle cx="50" cy="50" r="4" fill="white" />
      <path d="M48 50L52 50L54 58L46 58Z" fill="white" />
      
      {/* Vagues de prestige au bas */}
      <path d="M20 90Q35 85 50 90T80 90" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.5" />
    </svg>
  );
}
