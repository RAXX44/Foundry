/**
 * String Utility Functions
 * Naming convention helpers for code generation
 */

/**
 * Convert string to PascalCase (singular)
 * Examples: "users" -> "User", "blog_posts" -> "BlogPost"
 */
export function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (c) => c.toUpperCase())
    .replace(/s$/, ''); // Remove trailing 's' for singular
}

/**
 * Convert string to camelCase
 * Examples: "user_id" -> "userId", "BlogPost" -> "blogPost"
 */
export function toCamelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (c) => c.toLowerCase());
}

/**
 * Convert string to snake_case
 * Examples: "userId" -> "user_id", "BlogPost" -> "blog_post"
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * Singularize a word (basic implementation)
 * Examples: "users" -> "user", "categories" -> "category"
 */
export function singularize(word: string): string {
  if (word.endsWith('ies')) {
    return word.slice(0, -3) + 'y';
  }
  if (word.endsWith('ses') || word.endsWith('xes') || word.endsWith('zes')) {
    return word.slice(0, -2);
  }
  if (word.endsWith('s') && !word.endsWith('ss')) {
    return word.slice(0, -1);
  }
  return word;
}

/**
 * Pluralize a word (basic implementation)
 * Examples: "user" -> "users", "category" -> "categories"
 */
export function pluralize(word: string): string {
  if (word.endsWith('y') && !['a', 'e', 'i', 'o', 'u'].includes(word[word.length - 2])) {
    return word.slice(0, -1) + 'ies';
  }
  if (word.endsWith('s') || word.endsWith('x') || word.endsWith('z') || word.endsWith('ch') || word.endsWith('sh')) {
    return word + 'es';
  }
  return word + 's';
}

/**
 * Normalize model name to singular PascalCase
 * Examples: "blog_posts" -> "BlogPost", "Users" -> "User"
 */
export function normalizeModelName(name: string): string {
  const singular = singularize(name);
  return toPascalCase(singular);
}

/**
 * Normalize field name to camelCase
 * Examples: "user_id" -> "userId", "FirstName" -> "firstName"
 */
export function normalizeFieldName(name: string): string {
  return toCamelCase(name);
}

// Made with Bob
