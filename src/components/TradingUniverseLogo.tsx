import React from 'react';

interface TradingUniverseLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showGlow?: boolean;
}

export const TradingUniverseLogo: React.FC<TradingUniverseLogoProps> = ({
  className = '',
  size = 'md',
  showGlow = true,
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6 rounded-lg',
    sm: 'w-8 h-8 rounded-xl',
    md: 'w-9 h-9 rounded-xl',
    lg: 'w-12 h-12 rounded-2xl',
    xl: 'w-16 h-16 rounded-3xl',
  }[size];

  return (
    <div
      className={`relative shrink-0 overflow-hidden flex items-center justify-center bg-black border border-white/20 transition-all duration-300 group hover:scale-105 ${
        showGlow ? 'shadow-[0_0_14px_rgba(255,255,255,0.18)]' : 'shadow-md'
      } ${sizeClasses} ${className}`}
    >
      <img
        src="/trading-universe-logo.jpg"
        alt="Trading Universe Galaxy Logo"
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover select-none pointer-events-none transform scale-[1.08]"
      />
      {/* Specular glass reflection overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/25 pointer-events-none" />
    </div>
  );
};
