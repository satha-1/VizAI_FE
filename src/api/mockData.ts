import {
  BehaviorEvent,
  BehaviorType,
  DashboardSummary,
  Animal,
  HourlyHeatmapData,
  BehaviorSummary
} from '../types';
import { getZooHour } from '../utils/timezone';

// Helper to generate random ID
const generateId = () => Math.random().toString(36).substring(2, 15);

// Helper to generate random date within range
const randomDateInRange = (start: Date, end: Date): Date => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Helper to format duration
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Behavior colors for consistent styling
export const behaviorColors: Record<BehaviorType, string> = {
  'Pacing': '#008C8C',
  'Recumbent': '#374151',
  'Scratching': '#A3E635',
  'Self-directed': '#00A3A3',
};

// Camera sources
const cameraSources = ['Fixed Cam 1', 'Fixed Cam 2', 'PTZ Cam 1', 'PTZ Cam 2'];

// Generate mock behavior events
export const generateMockBehaviorEvents = (
  startDate: Date,
  endDate: Date,
  count: number = 50
): BehaviorEvent[] => {
  const behaviors: BehaviorType[] = ['Pacing', 'Recumbent', 'Scratching', 'Self-directed'];
  const events: BehaviorEvent[] = [];

  for (let i = 0; i < count; i++) {
    const start = randomDateInRange(startDate, endDate);
    const durationSeconds = Math.floor(Math.random() * 600) + 30; // 30s to 10min
    const end = new Date(start.getTime() + durationSeconds * 1000);

    events.push({
      id: generateId(),
      behavior_type: behaviors[Math.floor(Math.random() * behaviors.length)],
      start_timestamp: start.toISOString(),
      end_timestamp: end.toISOString(),
      duration_seconds: durationSeconds,
      camera_source: cameraSources[Math.floor(Math.random() * cameraSources.length)],
      video_url: `https://example.com/videos/${generateId()}.mp4`,
      thumbnail_url: `https://placehold.co/320x180/008C8C/white?text=Behavior+${i + 1}`,
      confidence_score: 0.7 + Math.random() * 0.3, // 0.7 to 1.0
      environmental_context: {
        temperature: Math.floor(Math.random() * 10) + 20, // 20-30°C
        visitor_count: Math.floor(Math.random() * 50),
      },
    });
  }

  return events.sort((a, b) =>
    new Date(b.start_timestamp).getTime() - new Date(a.start_timestamp).getTime()
  );
};

// Generate mock summary data
export const generateMockSummary = (events: BehaviorEvent[]): DashboardSummary => {
  const behaviors: BehaviorType[] = ['Pacing', 'Recumbent', 'Scratching', 'Self-directed'];
  const behaviorStats: Record<BehaviorType, { count: number; totalDuration: number; durations: number[] }> = {
    'Pacing': { count: 0, totalDuration: 0, durations: [] },
    'Recumbent': { count: 0, totalDuration: 0, durations: [] },
    'Scratching': { count: 0, totalDuration: 0, durations: [] },
    'Self-directed': { count: 0, totalDuration: 0, durations: [] },
  };

  events.forEach(event => {
    behaviorStats[event.behavior_type].count++;
    behaviorStats[event.behavior_type].totalDuration += event.duration_seconds;
    behaviorStats[event.behavior_type].durations.push(event.duration_seconds);
  });

  const totalDuration = Object.values(behaviorStats).reduce((sum, b) => sum + b.totalDuration, 0);
  const totalCount = events.length;

  const summaries: BehaviorSummary[] = behaviors.map(behavior => {
    const stats = behaviorStats[behavior];
    const durations = stats.durations.length > 0 ? stats.durations : [0];
    return {
      behavior_type: behavior,
      count: stats.count,
      total_duration_seconds: stats.totalDuration,
      average_duration_seconds: stats.count > 0 ? Math.round(stats.totalDuration / stats.count) : 0,
      min_duration_seconds: Math.min(...durations),
      max_duration_seconds: Math.max(...durations),
      percentage_of_total: totalDuration > 0 ? (stats.totalDuration / totalDuration) * 100 : 0,
    };
  });

  // Find most frequent behavior
  const mostFrequent = summaries.reduce((max, b) => b.count > max.count ? b : max, summaries[0]);

  // Generate hourly heatmap (using zoo timezone)
  const hourlyHeatmap: HourlyHeatmapData[] = [];
  behaviors.forEach(behavior => {
    for (let hour = 0; hour < 24; hour++) {
      const hourEvents = events.filter(e => {
        // Use zoo timezone for hour calculation
        const eventHour = getZooHour(e.start_timestamp);
        return e.behavior_type === behavior && eventHour === hour;
      });
      hourlyHeatmap.push({
        behavior_type: behavior,
        hour,
        count: hourEvents.length,
        duration_seconds: hourEvents.reduce((sum, e) => sum + e.duration_seconds, 0),
      });
    }
  });

  return {
    total_behaviors: totalCount,
    most_frequent_behavior: mostFrequent.behavior_type,
    total_monitored_seconds: totalDuration,
    behaviors: summaries,
    hourly_heatmap: hourlyHeatmap,
  };
};

// Mock animal data
export const mockAnimal: Animal = {
  id: 'giant-anteater-001',
  species: 'Giant Anteater',
  name: 'Aria',
  age: 6,
  sex: 'Female',
  enclosure: 'B-2',
  status: 'Active',
  last_updated: new Date().toISOString(),
  image_url: 'https://placehold.co/400x300/008C8C/white?text=Aria',
};

// Mock user data
export const mockUser = {
  id: 'user-001',
  name: 'Dr. Researcher',
  email: 'researcher@metroparkszoo.org',
  avatar_url: undefined,
  role: 'Researcher' as const,
};

// Get date range from preset
export const getDateRangeFromPreset = (preset: string): { startDate: Date; endDate: Date } => {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  let startDate = new Date();

  switch (preset) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'last_7_days':
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'last_30_days':
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      break;
    default:
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
  }

  return { startDate, endDate };
};

