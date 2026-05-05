import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn - Utility to merge Tailwind classes efficiently.
 * @param {...any} inputs - Class names or conditional objects.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
