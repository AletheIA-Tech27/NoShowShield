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

export function cn(...inputs: ClassValue[]): string {
  return toValue(inputs);
}