/**
 * Formatting Utilities
 * 
 * Utility functions for formatting data in the application
 */

/**
 * Format duration in seconds to HH:MM:SS or MM:SS format
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Behavior colors using Modern Data Green palette
 * Teal: #008C8C - Balance between data and creativity
 * Lime Green: #A3E635 - Freshness, positive growth
 * Charcoal: #1F2937 - Strength and focus
 * Off White: #F9FAFB - Simplicity, clean dashboards (background)
 * Using Record<string, string> to support any behavior type from database
 */
export const behaviorColors: Record<string, string> = {
  // Keep key behaviors distinct (no shared colors)
  'Pacing': '#008C8C',          // Teal
  'Recumbent': '#1F2937',       // Charcoal
  'Scratching': '#A3E635',      // Lime Green
  'Self-directed': '#0891B2',   // Cyan
  'Self Directed': '#0891B2',   // Cyan (variant - no hyphen)
  'Non Recumbent': '#059669',   // Emerald
  'Non-Recumbent': '#059669',   // Emerald (hyphen variant)
};

// Cache for dynamically assigned colors (ensures unique colors per behavior during a session)
const assignedColors: Record<string, string> = {};
const usedColors = new Set<string>(Object.values(behaviorColors).map((c) => c.toLowerCase()));

function hashStringToInt(input: string): number {
  // djb2-ish
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function hslToHex(h: number, s: number, l: number): string {
  // h: 0-360, s/l: 0-100
  const _h = ((h % 360) + 360) % 360;
  const _s = Math.max(0, Math.min(100, s)) / 100;
  const _l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * _l - 1)) * _s;
  const x = c * (1 - Math.abs(((_h / 60) % 2) - 1));
  const m = _l - c / 2;

  let r1 = 0, g1 = 0, b1 = 0;
  if (_h < 60) { r1 = c; g1 = x; b1 = 0; }
  else if (_h < 120) { r1 = x; g1 = c; b1 = 0; }
  else if (_h < 180) { r1 = 0; g1 = c; b1 = x; }
  else if (_h < 240) { r1 = 0; g1 = x; b1 = c; }
  else if (_h < 300) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }

  const r = Math.round((r1 + m) * 255);
  const g = Math.round((g1 + m) * 255);
  const b = Math.round((b1 + m) * 255);

  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Helper to get color for any behavior type with dynamic fallback
 * Generates consistent colors for unknown behavior types
 */
export const getBehaviorColor = (behavior: string): string => {
  // First check static colors
  if (behaviorColors[behavior]) {
    return behaviorColors[behavior];
  }
  
  // Check if we've already assigned a color to this behavior
  if (assignedColors[behavior]) {
    return assignedColors[behavior];
  }
  
  // Deterministically generate a distinct HSL color per behavior.
  // Also avoid collisions with any already-used colors.
  const base = hashStringToInt(behavior.trim().toLowerCase());
  let hue = base % 360;
  // Return HEX so consumers (like Heatmap shading) can safely parse it.
  let color = hslToHex(hue, 72, 42);

  // Ensure uniqueness (very low collision probability, but we guard anyway)
  let attempts = 0;
  while (usedColors.has(color.toLowerCase()) && attempts < 360) {
    hue = (hue + 137) % 360; // golden angle step
    color = hslToHex(hue, 72, 42);
    attempts++;
  }

  assignedColors[behavior] = color;
  usedColors.add(color.toLowerCase());
  return color;
};

/**
 * Convert S3 URL to HTTP URL for video playback
 * Converts s3://bucket-name/path/to/file to https://bucket-name.s3.amazonaws.com/path/to/file
 */
export const convertS3UrlToHttp = (s3Url: string): string => {
  if (!s3Url) return '';
  
  // If already an HTTP URL, return as-is
  if (s3Url.startsWith('http://') || s3Url.startsWith('https://')) {
    return s3Url;
  }
  
  // Convert s3://bucket-name/path to https://bucket-name.s3.amazonaws.com/path
  if (s3Url.startsWith('s3://')) {
    const withoutProtocol = s3Url.slice(5); // Remove 's3://'
    const slashIndex = withoutProtocol.indexOf('/');
    if (slashIndex === -1) {
      // Just bucket name, no path
      return `https://${withoutProtocol}.s3.amazonaws.com`;
    }
    const bucketName = withoutProtocol.slice(0, slashIndex);
    const path = withoutProtocol.slice(slashIndex + 1);
    return `https://${bucketName}.s3.amazonaws.com/${path}`;
  }
  
  // Return original if format not recognized
  return s3Url;
};

/**
 * Check if a URL is an S3 URL
 */
export const isS3Url = (url: string): boolean => {
  return url?.startsWith('s3://') || false;
};

/**
 * Calculate age from date of birth
 */
export const calculateAge = (dateOfBirth: string): number => {
  if (!dateOfBirth) return 0;
  const birth = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

