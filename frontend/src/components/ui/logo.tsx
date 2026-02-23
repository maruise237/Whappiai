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
  size = 24,
  className, 
  showText = true, 
  orientation = 'horizontal',
  textClassName
}) => {
  return (
    <div 
      className={cn(
        "flex items-center gap-2",
        orientation === 'vertical' ? "flex-col" : "flex-row",
        className
      )}
      aria-label="Logo Whappi"
    >
      <div className="relative shrink-0">
        <Image
          src="/icon.png"
          alt="Whappi"
          width={size}
          height={size}
          className="object-contain"
          priority
        />
      </div>
      {showText && (
        <span className={cn(
          "font-semibold text-base tracking-tight text-foreground",
          textClassName
        )}>
          Whappi
        </span>
      )}
    </div>
  );
};

export default Logo;
