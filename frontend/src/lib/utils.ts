/**
 * Utility functions for common operations.
 */

/**
 * Merges class names conditionally.
 * Filters out falsy values and joins the remaining classes with spaces.
 *
 * @param {...(string|false|undefined|null)} cls - Class names to merge
 * @returns {string} Merged class names string
 * @example
 * cn('foo', false, 'bar', undefined, 'baz') // 'foo bar baz'
 * cn('btn', isActive && 'active', className) // 'btn active' (if isActive is true)
 */
export function cn(...cls: (string | false | undefined | null)[]): string {
  return cls.filter(Boolean).join(' ');
}

















