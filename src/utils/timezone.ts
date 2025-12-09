/**
 * Timezone Utilities
 * 
 * All timestamps in the database are stored as UTC (ISO 8601).
 * The UI displays timestamps in the zoo's local timezone.
 * 
 * This allows:
 * - Consistent storage regardless of user's location
 * - Accurate display based on zoo location
 * - Easy comparison and sorting of timestamps
 */

// Zoo timezone configuration - can be changed based on zoo location
// Common US timezones: 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'
export const ZOO_TIMEZONE = 'America/New_York'; // MetroParks Zoo timezone

/**
 * Format a UTC timestamp to the zoo's local time
 */
export function formatToZooTime(
  utcTimestamp: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = new Date(utcTimestamp);
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: ZOO_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };
  
  return date.toLocaleString('en-US', { ...defaultOptions, ...options });
}

/**
 * Format a UTC timestamp to a short date string in zoo timezone
 */
export function formatToZooDate(utcTimestamp: string): string {
  const date = new Date(utcTimestamp);
  
  return date.toLocaleDateString('en-US', {
    timeZone: ZOO_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a UTC timestamp to time only in zoo timezone
 */
export function formatToZooTimeOnly(utcTimestamp: string): string {
  const date = new Date(utcTimestamp);
  
  return date.toLocaleTimeString('en-US', {
    timeZone: ZOO_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format a UTC timestamp for display in timeline (date + time)
 */
export function formatTimestampForTimeline(utcTimestamp: string): string {
  const date = new Date(utcTimestamp);
  
  return date.toLocaleString('en-US', {
    timeZone: ZOO_TIMEZONE,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format a UTC timestamp for detailed display (full date + time + seconds)
 */
export function formatTimestampFull(utcTimestamp: string): string {
  const date = new Date(utcTimestamp);
  
  return date.toLocaleString('en-US', {
    timeZone: ZOO_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Get the hour in zoo timezone from a UTC timestamp (for heatmap)
 */
export function getZooHour(utcTimestamp: string): number {
  const date = new Date(utcTimestamp);
  
  // Get the hour in zoo timezone
  const zooTimeString = date.toLocaleString('en-US', {
    timeZone: ZOO_TIMEZONE,
    hour: 'numeric',
    hour12: false,
  });
  
  return parseInt(zooTimeString, 10);
}

/**
 * Format relative time (e.g., "5 min ago", "2 hours ago")
 */
export function formatRelativeTime(utcTimestamp: string): string {
  const date = new Date(utcTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  // For older timestamps, show the actual date in zoo timezone
  return formatToZooDate(utcTimestamp);
}

/**
 * Get current time in zoo timezone as ISO string (for creating new records)
 */
export function getCurrentZooTimeAsUTC(): string {
  return new Date().toISOString();
}

/**
 * Get the timezone abbreviation for display
 */
export function getZooTimezoneAbbreviation(): string {
  const date = new Date();
  const timeString = date.toLocaleTimeString('en-US', {
    timeZone: ZOO_TIMEZONE,
    timeZoneName: 'short',
  });
  
  // Extract timezone abbreviation (e.g., "EST", "EDT")
  const match = timeString.match(/[A-Z]{2,4}$/);
  return match ? match[0] : ZOO_TIMEZONE;
}

