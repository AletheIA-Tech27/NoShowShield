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

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm text-white transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };