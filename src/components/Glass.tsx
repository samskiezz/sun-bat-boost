import React from 'react';
import { cn } from '@/lib/utils';

interface GlassProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
}

export const Glass: React.FC<GlassProps> = ({ 
  className = "", 
  children, 
  hover = false,
  ...props 
}) => (
  <div 
    className={cn(
      "glass-card",
      hover && "hover-glass",
      className
    )} 
    {...props}
  >
    {children}
  </div>
);

export default Glass;