import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  orientation?: 'vertical' | 'horizontal';
  textClassName?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 40, 
  className, 
  showText = true, 
  orientation = 'vertical',
  textClassName
}) => {
  return (
    <div 
      className={cn(
        "flex items-center justify-center group cursor-pointer", 
        orientation === 'vertical' ? "flex-col gap-2" : "flex-row gap-3",
        className
      )}
      aria-label="Logo WHAPPI"
    >
      <style>
        {`
          @keyframes gradient-shift {
            0% { stroke: #22c55e; }
            50% { stroke: #86efac; }
            100% { stroke: #22c55e; }
          }
          .logo-w-path {
            transition: stroke 0.2s ease;
          }
          .group:hover .logo-w-path {
            animation: gradient-shift 2s infinite;
          }
        `}
      </style>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="hover:animate-pulse transition-all duration-200 shrink-0"
        shapeRendering="geometricPrecision"
      >
        <title>WHAPPI - Plateforme d'automatisation WhatsApp</title>
        {/* Message Bubble Background */}
        <rect
          x="10"
          y="10"
          width="80"
          height="80"
          rx="12"
          fill="var(--primary)"
        />
        {/* Stylized 'W' composed of 4 geometric lines */}
        <path
          className="logo-w-path"
          d="M25 35L37.5 65L50 45L62.5 65L75 35"
          stroke="var(--primary-foreground)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showText && (
        <span className={cn(
          "font-bold text-lg tracking-tight text-foreground transition-all duration-200 group-hover:opacity-80 uppercase",
          orientation === 'horizontal' && "leading-none",
          textClassName
        )}>
          WHAPPI
        </span>
      )}
    </div>
  );
};

export default Logo;
