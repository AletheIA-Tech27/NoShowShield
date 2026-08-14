import * as React from 'react';

type ClassValue = string | number | boolean | null | undefined | ClassArray | ClassObject;
type ClassArray = ClassValue[];
type ClassObject = { [key: string]: boolean };

function toValue(
  prop: ClassValue | ClassArray | ClassObject
): string {
  if (typeof prop === 'string' || typeof prop === 'number') {
    return String(prop);
  }
  if (Array.isArray(prop)) {
    return prop.flatMap(toValue).join(' ');
  }
  if (typeof prop === 'object' && prop !== null) {
    return Object.keys(prop)
      .filter((key) => prop[key])
      .join(' ');
  }
  return '';
}

function cn(...inputs: ClassValue[]): string {
  return toValue(inputs);
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
    
    const variants = {
      default: 'bg-indigo-600 text-white hover:bg-indigo-500',
      destructive: 'bg-rose-500 text-white hover:bg-rose-500/90',
      outline: 'border border-slate-700 bg-transparent hover:bg-slate-800 text-slate-100',
      secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700',
      ghost: 'hover:bg-slate-800 text-slate-100',
      link: 'text-indigo-400 underline-offset-4 hover:underline',
    };

    const sizes = {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 rounded-lg px-3',
      lg: 'h-11 rounded-lg px-8',
      icon: 'h-10 w-10',
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };