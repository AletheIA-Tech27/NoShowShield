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

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-slate-800 text-slate-100 border border-slate-700',
      destructive:
        'bg-rose-500/20 text-rose-300 border border-rose-500/30',
      outline: 'border border-slate-700 bg-transparent text-slate-300',
      secondary: 'bg-slate-800 text-slate-300 border border-slate-700',
      ghost: 'bg-transparent text-slate-300 border border-transparent',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';

export { Badge };