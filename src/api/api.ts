import { 
  BehaviorEvent, 
  DashboardSummary, 
  Animal, 
  ReportConfig, 
  GeneratedReport,
  ExportFormat,
  BehaviorType 
} from '../types';
import { 
  generateMockBehaviorEvents, 
  generateMockSummary, 
  mockAnimal, 
  getDateRangeFromPreset 
} from './mockData';

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Base API URL (for future use when connecting to real backend)
const API_BASE_URL = '/api/v1';

// Cache for mock data to ensure consistency
let cachedEvents: BehaviorEvent[] | null = null;
let cachedDateRange: { start: string; end: string } | null = null;

// API Functions

export const fetchBehaviorEvents = async (
  startDate: string,
  endDate: string,
  behaviorType?: BehaviorType
): Promise<BehaviorEvent[]> => {
  await delay(500 + Math.random() * 500);
  
  // Generate new events if date range changed
  if (!cachedEvents || !cachedDateRange || 
      cachedDateRange.start !== startDate || 
      cachedDateRange.end !== endDate) {
    cachedEvents = generateMockBehaviorEvents(
      new Date(startDate),
      new Date(endDate),
      60
    );
    cachedDateRange = { start: startDate, end: endDate };
  }
  
  let events = [...cachedEvents];
  
  if (behaviorType) {
    events = events.filter(e => e.behavior_type === behaviorType);
  }
  
  return events;
};

export const fetchBehaviorSummary = async (
  preset: string,
  startDate?: string,
  endDate?: string
): Promise<DashboardSummary> => {
  await delay(600 + Math.random() * 400);
  
  const dateRange = startDate && endDate 
    ? { startDate: new Date(startDate), endDate: new Date(endDate) }
    : getDateRangeFromPreset(preset);
  
  const events = generateMockBehaviorEvents(
    dateRange.startDate,
    dateRange.endDate,
    preset === 'today' ? 15 : preset === 'last_7_days' ? 50 : 120
  );
  
  return generateMockSummary(events);
};

export const fetchAnimal = async (animalId: string): Promise<Animal> => {
  await delay(300);
  
  if (animalId === 'giant-anteater') {
    return mockAnimal;
  }
  
  throw new Error('Animal not found');
};

export const fetchVideoMetadata = async (eventId: string): Promise<BehaviorEvent> => {
  await delay(200);
  
  if (cachedEvents) {
    const event = cachedEvents.find(e => e.id === eventId);
    if (event) return event;
  }
  
  throw new Error('Video not found');
};

export const generateReport = async (
  config: ReportConfig,
  format: ExportFormat
): Promise<GeneratedReport> => {
  await delay(2000 + Math.random() * 1000);
  
  return {
    id: `report-${Date.now()}`,
    config,
    generated_at: new Date().toISOString(),
    download_url: `${API_BASE_URL}/reports/download/report-${Date.now()}.${format}`,
    format,
  };
};

export const sendChatQuery = async (
  query: string,
  _conversationId?: string
): Promise<{ response: string; conversationId: string }> => {
  await delay(1000 + Math.random() * 500);
  
  // Mock responses based on query keywords
  const lowerQuery = query.toLowerCase();
  let response = '';
  
  if (lowerQuery.includes('pace') || lowerQuery.includes('pacing')) {
    response = 'Based on the data from the last 7 days, Aria exhibited pacing behavior 12 times, with an average duration of 4 minutes and 32 seconds per episode. The most frequent pacing occurred during the morning hours (8-10 AM), which coincides with the start of visitor activity.';
  } else if (lowerQuery.includes('unusual') || lowerQuery.includes('abnormal')) {
    response = 'I noticed a slight increase in self-directed behavior on Tuesday, which was 23% higher than the weekly average. This coincided with maintenance work being done near the enclosure. The behavior returned to normal levels by Wednesday afternoon.';
  } else if (lowerQuery.includes('rest') || lowerQuery.includes('sleep')) {
    response = 'Aria\'s recumbent (resting) behavior has been consistent this week, averaging 8.5 hours per day. Most rest periods occur between 12 PM and 4 PM, which is typical for giant anteaters in captivity.';
  } else if (lowerQuery.includes('scratch')) {
    response = 'Scratching behavior was observed 8 times this week, with durations ranging from 30 seconds to 3 minutes. All instances appear normal and are part of typical grooming behavior.';
  } else {
    response = `I've analyzed the recent behavior data for Aria. Over the selected time period, I recorded ${Math.floor(Math.random() * 50) + 20} behavior events. Would you like me to provide more specific insights about any particular behavior or time period?`;
  }
  
  return {
    response,
    conversationId: _conversationId || `conv-${Date.now()}`,
  };
};

