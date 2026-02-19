/**
 * Utility functions for formatting user input.
 */

/**
 * Capitalize the first letter of each word in a name.
 * Handles hyphenated names (Jean-Pierre → Jean-Pierre)
 * Handles apostrophes (d'Artagnan → D'Artagnan)
 * 
 * @param name - The name to capitalize
 * @returns The capitalized name
 */
export function capitalizeName(name: string): string {
  if (!name) return name;
  
  return name
    .toLowerCase()
    .split(/(\s+|-|')/)
    .map((part, index, arr) => {
      // Keep separators as-is
      if (part === ' ' || part === '-' || part === "'") return part;
      // Capitalize first letter
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
}

/**
 * Format a phone number to Belgian format: +32 xxx xx xx xx
 * Handles various input formats:
 * - +32xxxxxxxxx
 * - +32 xxx xx xx xx
 * - 04xxxxxxxx
 * - 0032xxxxxxxxx
 * 
 * @param phone - The phone number to format
 * @returns The formatted phone number
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return phone;
  
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Handle different prefixes
  if (cleaned.startsWith('+32')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('0032')) {
    cleaned = cleaned.slice(4);
  } else if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  } else if (cleaned.startsWith('+')) {
    // Other country code - return as-is with basic spacing
    return phone;
  }
  
  // Remove any remaining leading zeros
  cleaned = cleaned.replace(/^0+/, '');
  
  // Ensure we have enough digits for Belgian format
  if (cleaned.length < 8 || cleaned.length > 10) {
    // Return original if format is unexpected
    return phone;
  }
  
  // Pad to 9 digits if needed (Belgian mobile numbers are 9 digits after country code)
  if (cleaned.length === 8) {
    cleaned = '4' + cleaned; // Assume mobile if 8 digits
  }
  
  // Format as +32 xxx xx xx xx
  const part1 = cleaned.slice(0, 3);
  const part2 = cleaned.slice(3, 5);
  const part3 = cleaned.slice(5, 7);
  const part4 = cleaned.slice(7, 9);
  
  return `+32 ${part1} ${part2} ${part3} ${part4}`;
}
