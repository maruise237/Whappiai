import React from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

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
      <div className="relative hover:scale-105 transition-transform duration-200">
        <Image
          src="/icon.png"
          alt="Whappi Logo"
          width={size}
          height={size}
          className="object-contain"
          priority
        />
      </div>
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
