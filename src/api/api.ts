import { 
  BehaviorEvent, 
  DashboardSummary, 
  Animal, 
  ReportConfig, 
  GeneratedReport,
  ExportFormat,
  BehaviorType,
  HourlyHeatmapData,
  BehaviorSummary
} from '../types';
import { getZooHour } from '../utils/timezone';
import { convertS3UrlToHttp, isS3Url } from '../utils/formatting';
import { 
  getAllAnimalsApi,
  getAnimalProfileApi,
  createAnimalProfileApi,
  updateAnimalProfileApi,
  deleteAnimalProfileApi,
  getAnteaterTimelineApi,
  generateReportApi,
} from './endpoints';

// Map frontend animal ID to backend animal ID
const ANIMAL_ID_MAP: Record<string, string> = {
  'giant-anteater': 'GAE-01',
};

const ANIMAL_NAME_MAP: Record<string, string> = {
  'giant-anteater': 'anteater',
};

// Map frontend behavior types (title case) to backend behavior types (uppercase)
const BEHAVIOR_TYPE_MAP: Record<BehaviorType, string> = {
  'Pacing': 'PACING',
  'Recumbent': 'RECUMBENT',
  'Scratching': 'SCRATCHING',
  'Self-directed': 'SELF_DIRECTED',
};

// Reverse map: backend behavior types to frontend format
// NOTE: For dashboard correctness, we preserve suffixes (START/STOPPED) as distinct labels.
const BACKEND_TO_FRONTEND_BEHAVIOR_MAP: Record<string, BehaviorType> = {
  'PACING': 'Pacing',
  'PACING_START': 'Pacing Start',
  'PACING_STOPPED': 'Pacing Stopped',
  'PACING_END': 'Pacing End',
  'RECUMBENT': 'Recumbent',
  'RECUMBENT_START': 'Recumbent Start',
  'RECUMBENT_END': 'Recumbent End',
  'RECUMBENT_STOPPED': 'Recumbent Stopped',
  'NON-RECUMBENT': 'Non Recumbent',
  'NON_RECUMBENT': 'Non Recumbent',
  'SCRATCHING': 'Scratching',
  'SCRATCHING_START': 'Scratching Start',
  'SCRATCHING_END': 'Scratching End',
  'SCRATCHING_STOPPED': 'Scratching Stopped',
  'SELF_DIRECTED': 'Self-directed',
  'SELF_DIRECTED_START': 'Self-directed Start',
  'SELF_DIRECTED_END': 'Self-directed End',
  'SELF_DIRECTED_STOPPED': 'Self-directed Stopped',
  'SELF-DIRECTED': 'Self-directed',
  'SELF-DIRECTED_START': 'Self-directed Start',
  'SELF-DIRECTED_END': 'Self-directed End',
  'SELF-DIRECTED_STOPPED': 'Self-directed Stopped',
  // Also handle title case in case backend returns it
  'Pacing': 'Pacing',
  'Recumbent': 'Recumbent',
  'Non Recumbent': 'Non Recumbent',
  'Scratching': 'Scratching',
  'Self-directed': 'Self-directed',
};

// Helper: title-case a backend behavior string while preserving tokens/suffixes
const titleCaseBehavior = (backendType: string): string => {
  if (!backendType) return 'Unknown';
  return backendType
    .trim()
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Helper to get backend animal ID
const getBackendAnimalId = (frontendAnimalId: string): string => {
  return ANIMAL_ID_MAP[frontendAnimalId] || frontendAnimalId;
};

// Helper to get backend animal name
const getBackendAnimalName = (frontendAnimalId: string): string => {
  return ANIMAL_NAME_MAP[frontendAnimalId] || frontendAnimalId;
};

// Helper to convert frontend behavior type to backend format
const getBackendBehaviorType = (behaviorType: BehaviorType): string => {
  return BEHAVIOR_TYPE_MAP[behaviorType] || behaviorType.toUpperCase();
};

// Helper to convert backend behavior type to frontend format (preserves suffixes)
const getFrontendBehaviorType = (backendType: string): BehaviorType => {
  if (!backendType) return 'Unknown';
  
  // First try exact match in the mapping (for known behaviors)
  if (BACKEND_TO_FRONTEND_BEHAVIOR_MAP[backendType]) {
    return BACKEND_TO_FRONTEND_BEHAVIOR_MAP[backendType];
  }

  // Try uppercase exact match
  const upper = backendType.toUpperCase();
  if (BACKEND_TO_FRONTEND_BEHAVIOR_MAP[upper]) {
    return BACKEND_TO_FRONTEND_BEHAVIOR_MAP[upper];
  }

  // Dynamic conversion preserving suffix tokens
  const titleCased = titleCaseBehavior(backendType);

  // Keep the special hyphenation for self-directed if backend sends SELF_DIRECTED
  if (titleCased === 'Self Directed') return 'Self-directed';
  if (titleCased.startsWith('Self Directed ')) return (`Self-directed ${titleCased.replace('Self Directed ', '')}` as BehaviorType);

  console.log(`🏷️ Dynamic behavior mapping: "${backendType}" -> "${titleCased}"`);
  return titleCased || 'Unknown';
};

// Transform behavior event from backend format to frontend format
const transformBehaviorEvent = (event: any): BehaviorEvent => {
  if (!event) {
    throw new Error('Invalid event data');
  }
  
  // Handle different field name formats (PascalCase, snake_case, camelCase, lowercase)
  // Note: API now returns "behaviour" (lowercase, British spelling) as the key
  const behaviorType = event.Behaviour || event.behaviour || event.behavior_type || event.behaviour_type || event.behavior || 'RECUMBENT';
  const transformedType = getFrontendBehaviorType(behaviorType);
  
  // Handle different timestamp formats
  // Priority: start_datetime/end_datetime (new timeline format) > timestamp_from_camera > detection_timestamp > StartTime > etc.
  const startTime = event.start_datetime || event.timestamp_from_camera || event.detection_timestamp || event.StartTime || event.start_timestamp || event.start_time || event.timestamp || event.start_date;
  const endTime = event.end_datetime || event.EndTime || event.end_timestamp || event.end_time || event.end_date;
  
  console.log(`🔄 Transforming event: behaviour=${event.behaviour || event.Behavior || event.behavior_type}, start_datetime=${event.start_datetime}, end_datetime=${event.end_datetime}, duration=${event.duration}`);
  
  // Convert date strings to ISO format if needed
  const formatTimestamp = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString();
    // If it's already ISO format, return as is
    if (dateStr.includes('T') || dateStr.includes('Z')) {
      return dateStr;
    }
    // Handle timeline format: "2025-10-20 02:52:05" (YYYY-MM-DD HH:mm:ss)
    if (dateStr.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
      return new Date(dateStr.replace(' ', 'T')).toISOString();
    }
    // Handle timeline format with day name: "2025-10-20 02:52:05 (Mon)" - remove day name in parentheses
    if (dateStr.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \([\w]{3}\)$/)) {
      const cleaned = dateStr.replace(/ \([\w]{3}\)$/, '');
      return new Date(cleaned.replace(' ', 'T')).toISOString();
    }
    // Handle RFC 2822 format like "Mon, 20 Oct 2025 02:52:57 GMT"
    if (dateStr.match(/^[A-Za-z]{3}, \d{1,2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/)) {
      return new Date(dateStr).toISOString();
    }
    // If it's just date, add time
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return new Date(dateStr + 'T00:00:00').toISOString();
    }
    return new Date(dateStr).toISOString();
  };
  
  // Parse duration string "HH:MM:SS" to seconds
  const parseDurationString = (durationStr: string): number => {
    if (!durationStr || typeof durationStr !== 'string') return 0;
    // Handle format "HH:MM:SS" or "H:MM:SS"
    const match = durationStr.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const seconds = parseInt(match[3], 10);
      return hours * 3600 + minutes * 60 + seconds;
    }
    return 0;
  };
  
  const startTimestamp = formatTimestamp(startTime);
  const endTimestamp = endTime ? formatTimestamp(endTime) : null;
  
  // Calculate duration and end timestamp
  // Priority: duration string (HH:MM:SS) > duration_seconds > frame_time_seconds > calculated from timestamps
  let durationSeconds = 0;
  
  // First, try to parse duration string if provided
  if (event.duration && typeof event.duration === 'string') {
    durationSeconds = parseDurationString(event.duration);
    console.log(`📊 Parsed duration string "${event.duration}" to ${durationSeconds} seconds`);
  } else {
    // Fallback to numeric duration fields
    durationSeconds = event.duration_seconds || event.frame_time_seconds || event.duration || event.duration_sec || 0;
  }
  
  let finalEndTimestamp: string;
  
  // If we have end_datetime, use it
  if (endTimestamp) {
    finalEndTimestamp = endTimestamp;
    // If duration is 0 or not provided, calculate from start and end timestamps
    if (durationSeconds === 0) {
      const start = new Date(startTimestamp);
      const end = new Date(endTimestamp);
      durationSeconds = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
    }
  } else if (durationSeconds > 0 && startTimestamp) {
    // Calculate end timestamp from start + duration
    const startDate = new Date(startTimestamp);
    const endDate = new Date(startDate.getTime() + durationSeconds * 1000);
    finalEndTimestamp = endDate.toISOString();
  } else {
    // No end time and no duration - assume instant event (0 duration)
    finalEndTimestamp = startTimestamp;
    durationSeconds = 0;
  }
  
  return {
    id: event.id || event.event_id || event.behavior_id || `event-${Date.now()}-${Math.random()}`,
    behavior_type: transformedType,
    raw_behavior_type: typeof behaviorType === 'string' ? behaviorType : undefined,
    start_timestamp: startTimestamp,
    end_timestamp: finalEndTimestamp,
    duration_seconds: durationSeconds,
    camera_source: event.camera_source || event.CameraSource || event.camera || event.camera_name || 'Unknown',
    raw_video_url: event.video_url || event.VideoUrl || event.video || event.video_path || '',
    video_url: (() => {
      const raw = (event.video_url || event.VideoUrl || event.video || event.video_path || '') as string;
      return isS3Url(raw) ? convertS3UrlToHttp(raw) : raw;
    })(),
    thumbnail_url: event.thumbnail_url || event.ThumbnailUrl || event.thumbnail || event.thumbnail_path || event.image_url || '',
    confidence_score: typeof event.confidence_score === 'number' 
      ? event.confidence_score / 100 // Convert percentage to decimal (e.g., 88.54 -> 0.8854)
      : typeof event.confidence === 'number'
      ? event.confidence / 100
      : (event.Confidence || 0) / 100 || 0,
    environmental_context: event.environmental_context || event.context || event.environment,
  };
};

// API Functions

/**
 * Fetch behavior events for a date range
 * Uses the timeline endpoint: /api/v1/anteater/:animal_id/timeline
 */
export const fetchBehaviorEvents = async (
  startDate: string,
  endDate: string,
  behaviorType?: BehaviorType,
  frontendAnimalId?: string
): Promise<BehaviorEvent[]> => {
  try {
    // Get the animal ID for the timeline endpoint
    // If frontendAnimalId is provided, use it; otherwise default to 'giant-anteater'
    const animalId = getBackendAnimalId(frontendAnimalId || 'giant-anteater');
    
    console.log('🔍 Fetching timeline with dates:', { startDate, endDate, animalId }); // Debug log
    
    const response = await getAnteaterTimelineApi(animalId, startDate, endDate);
    
    console.log('📦 Raw Timeline API Response:', JSON.stringify(response, null, 2)); // Debug log
    console.log('📦 Response type:', typeof response); // Debug log
    console.log('📦 Is array?', Array.isArray(response)); // Debug log
    
    // Extract date range from response if available (for date filter initialization)
    let responseStartDate = startDate;
    let responseEndDate = endDate;
    if (response && typeof response === 'object' && !Array.isArray(response)) {
      if ((response as any).start_date) {
        responseStartDate = (response as any).start_date;
        console.log('📅 Using start_date from API response:', responseStartDate);
      }
      if ((response as any).end_date) {
        responseEndDate = (response as any).end_date;
        console.log('📅 Using end_date from API response:', responseEndDate);
      }
    }
    
    // Handle different response formats
    let events: any[] = [];
    if (Array.isArray(response)) {
      console.log('✅ Response is direct array');
      events = response;
    } else if (response && typeof response === 'object') {
      // Check if it's an error response (e.g., {"error": "No data found"})
      if ((response as any).error) {
        console.log('⚠️ API returned error:', (response as any).error);
        // Return empty array for "No data found" errors - this is not a real error
        return [];
      }
      
      console.log('📋 Response is object, checking for timeline/behaviours/behaviors...');
      // Check for timeline array first (new format)
      if ((response as any).timeline !== undefined) {
        console.log('✅ Found "timeline" key:', (response as any).timeline);
        if (Array.isArray((response as any).timeline)) {
          events = (response as any).timeline;
        } else {
          console.warn('⚠️ "timeline" is not an array:', typeof (response as any).timeline);
        }
      } else if ((response as any).behaviours !== undefined) {
        console.log('✅ Found "behaviours" key:', (response as any).behaviours);
        if (Array.isArray((response as any).behaviours)) {
          events = (response as any).behaviours;
        } else {
          console.warn('⚠️ "behaviours" is not an array:', typeof (response as any).behaviours);
        }
      } else if ((response as any).behaviors !== undefined) {
        console.log('✅ Found "behaviors" key:', (response as any).behaviors);
        if (Array.isArray((response as any).behaviors)) {
          events = (response as any).behaviors;
        }
      } else if ((response as any).data !== undefined) {
        console.log('✅ Found "data" key');
        if (Array.isArray((response as any).data)) {
          events = (response as any).data;
        }
      } else if ((response as any).events !== undefined) {
        console.log('✅ Found "events" key');
        if (Array.isArray((response as any).events)) {
          events = (response as any).events;
        }
      } else {
        console.warn('⚠️ No recognized array key found in response. Keys:', Object.keys(response as any));
      }
    }
    
    console.log('📊 Extracted events array:', events); // Debug log
    console.log('📊 Events count:', events.length); // Debug log
    
    // Each item in the behaviors array is already an individual event
    // No need to expand - just ensure each has an ID
    const expandedEvents: any[] = [];
    events.forEach((event, index) => {
      // Each event is already individual, so just add it
      // Handle both numeric ID (from API) and string ID formats
      expandedEvents.push({
        ...event,
        id: event.id ? String(event.id) : event.ID ? String(event.ID) : `event-${index}-${Date.now()}`,
      });
    });
    
    console.log(`📊 Expanded ${expandedEvents.length} events from ${events.length} items`);
    
    // Transform events to frontend format
    console.log('🔄 Transforming events...');
    const transformedEvents = expandedEvents.map((event, idx) => {
      try {
        const transformed = transformBehaviorEvent(event);
        console.log(`✅ Transformed event ${idx}:`, transformed);
        return transformed;
      } catch (transformError) {
        console.error(`❌ Error transforming event ${idx}:`, transformError, event);
        throw transformError;
      }
    });
    
    console.log('✨ Final transformed events:', transformedEvents); // Debug log
    console.log('✨ Final count:', transformedEvents.length); // Debug log
    
    // Filter by behavior type if specified
  if (behaviorType) {
      const filtered = transformedEvents.filter(e => e.behavior_type === behaviorType);
      console.log(`🔍 Filtered by ${behaviorType}:`, filtered.length, 'events');
      return filtered;
    }
    
    return transformedEvents;
  } catch (error) {
    console.error('❌ Error fetching behavior events:', error);
    console.error('Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
    });
    throw error;
  }
};

/**
 * Fetch behavior summary for dashboard
 * Calculates summary ONLY from timeline API - no separate summary endpoint
 */
export const fetchBehaviorSummary = async (
  _preset: string,
  startDate?: string,
  endDate?: string,
  frontendAnimalId?: string
): Promise<DashboardSummary> => {
  try {
    // If dates are provided, use them; otherwise throw error
    if (!startDate || !endDate) {
      throw new Error('startDate and endDate are required for behavior summary');
    }
    
    console.log('🔍 Fetching behavior summary from timeline API with dates:', { startDate, endDate, frontendAnimalId });
    
    // Fetch behavior events from timeline API and calculate summary from them
    const events = await fetchBehaviorEvents(startDate, endDate, undefined, frontendAnimalId);
    console.log('📊 Fetched events for summary:', events.length);
    
    // Always generate summary from timeline events - no separate summary API
    return generateSummaryFromEvents(events, startDate, endDate);
  } catch (error) {
    console.error('Error fetching behavior summary:', error);
    throw error;
  }
};

/**
 * Generate summary from behavior events
 */
function generateSummaryFromEvents(events: BehaviorEvent[], _startDate: string, _endDate: string): DashboardSummary {
  console.log(`🔄 Generating summary from ${events.length} events...`);
  const behaviorMap = new Map<string, BehaviorSummary>();
  // Ensure every behavior seen in the timeline exists in the summary (even if duration/count is 0 later)
  const allBehaviorTypes = Array.from(new Set(events.map((e) => e.behavior_type)));
  allBehaviorTypes.forEach((behaviorType) => {
    if (!behaviorMap.has(behaviorType)) {
      behaviorMap.set(behaviorType, {
        behavior_type: behaviorType,
        count: 0,
        total_duration_seconds: 0,
        average_duration_seconds: 0,
        min_duration_seconds: 0,
        max_duration_seconds: 0,
        percentage_of_total: 0,
      });
    }
  });
  
  // Count behaviors by type
  const behaviorCounts = new Map<string, number>();
  events.forEach((event) => {
    const count = behaviorCounts.get(event.behavior_type) || 0;
    behaviorCounts.set(event.behavior_type, count + 1);
  });
  console.log('📊 Behavior counts:', Array.from(behaviorCounts.entries()).map(([type, count]) => `${type}: ${count}`));
  
  events.forEach((event) => {
    const behaviorType = event.behavior_type;
    
    if (!behaviorMap.has(behaviorType)) {
      behaviorMap.set(behaviorType, {
        behavior_type: behaviorType,
        count: 0,
        total_duration_seconds: 0,
        average_duration_seconds: 0,
        min_duration_seconds: 0,
        max_duration_seconds: 0,
        percentage_of_total: 0,
      });
    }
    
    const existing = behaviorMap.get(behaviorType)!;
    existing.count += 1;
    existing.total_duration_seconds += event.duration_seconds;
    // Track min/max based on non-zero durations; if all are zero, min/max remains 0
    if (event.duration_seconds > 0) {
      existing.min_duration_seconds = existing.min_duration_seconds === 0
        ? event.duration_seconds
        : Math.min(existing.min_duration_seconds, event.duration_seconds);
      existing.max_duration_seconds = Math.max(existing.max_duration_seconds, event.duration_seconds);
    }
  });
  
  const behaviors = Array.from(behaviorMap.values());
  const totalBehaviors = behaviors.reduce((sum, b) => sum + b.count, 0);
  const totalDuration = behaviors.reduce((sum, b) => sum + b.total_duration_seconds, 0);
  
  behaviors.forEach(b => {
    b.average_duration_seconds = b.count > 0 ? b.total_duration_seconds / b.count : 0;
    b.percentage_of_total = totalDuration > 0 ? (b.total_duration_seconds / totalDuration) * 100 : 0;
  });
  
  console.log(`✅ Generated summary with ${behaviors.length} behavior types:`, behaviors.map(b => `${b.behavior_type} (${b.count} events, ${b.total_duration_seconds}s total)`));
  
  const hourlyHeatmap = generateHeatmapFromEvents(events);
  
  return {
    total_behaviors: totalBehaviors,
    most_frequent_behavior: behaviors.length > 0 
      ? behaviors.reduce((max, b) => b.count > max.count ? b : max, behaviors[0]).behavior_type
      : 'No Data',
    total_monitored_seconds: totalDuration,
    behaviors: behaviors,
    hourly_heatmap: hourlyHeatmap,
  };
}

/**
 * Generate hourly heatmap from behavior events
 * Dynamically gets behavior types from events
 */
function generateHeatmapFromEvents(events: BehaviorEvent[]): HourlyHeatmapData[] {
  const heatmapMap = new Map<string, { count: number; duration: number }>();
  const uniqueBehaviors = new Set<string>();
  
  events.forEach(event => {
    const hour = getZooHour(event.start_timestamp);
    const key = `${event.behavior_type}-${hour}`;
    uniqueBehaviors.add(event.behavior_type);
    
    if (!heatmapMap.has(key)) {
      heatmapMap.set(key, { count: 0, duration: 0 });
    }
    
    const data = heatmapMap.get(key)!;
    data.count += 1;
    data.duration += event.duration_seconds;
  });
  
  const heatmap: HourlyHeatmapData[] = [];
  // Use dynamic behaviors from events, fallback to common ones if no events
  const behaviors: string[] = uniqueBehaviors.size > 0 
    ? Array.from(uniqueBehaviors).sort()
    : ['Pacing', 'Recumbent', 'Self-directed', 'Non Recumbent'];
  
  behaviors.forEach(behavior => {
    for (let hour = 0; hour < 24; hour++) {
      const key = `${behavior}-${hour}`;
      const data = heatmapMap.get(key);
      heatmap.push({
        behavior_type: behavior,
        hour,
        count: data?.count || 0,
        duration_seconds: data?.duration || 0,
      });
    }
  });
  
  return heatmap;
}

/**
 * Fetch all animals
 * GET /api/v1/animals
 */
export const fetchAllAnimals = async (): Promise<any[]> => {
  try {
    const response = await getAllAnimalsApi();
    return Array.isArray(response) ? response : [];
  } catch (error) {
    console.error('Error fetching all animals:', error);
    throw error;
  }
};

/**
 * Fetch animal profile
 * Uses the animal profile endpoint
 */
function transformAnimalProfileData(animalData: any, fallbackId: string, fallbackSpecies?: string): Animal {
  // Calculate age from date_of_birth if available
  let calculatedAge = animalData?.age || 0;
  if (animalData?.date_of_birth && !animalData?.age) {
    try {
      const birthDate = new Date(animalData.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      calculatedAge = age;
    } catch {
      // Keep default age if calculation fails
    }
  }

  // Normalize gender/sex field
  const gender = animalData?.gender || animalData?.sex || 'Female';
  const normalizedGender = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
  const finalGender = normalizedGender === 'Female' ? 'Female' : 'Male';

  return {
    id: animalData?.id || animalData?.animal_id || fallbackId,
    species: animalData?.species || animalData?.animal_species || fallbackSpecies || animalData?.animal_name || 'Unknown',
    name: animalData?.name || animalData?.animal_name || 'Unknown',
    age: calculatedAge,
    sex: finalGender as 'Male' | 'Female',
    // Many profile payloads don't include enclosure; use environment_id as a decent fallback label
    enclosure: animalData?.enclosure || animalData?.habitat || animalData?.environment_id || 'Unknown',
    status: (animalData?.status === 'Alert' ? 'Active' : animalData?.status) || 'Active',
    last_updated:
      animalData?.last_updated ||
      animalData?.updated_at ||
      animalData?.animal_modified_at ||
      new Date().toISOString(),
    image_url: animalData?.image_url || animalData?.image || animalData?.photo_url,
    // Additional backend fields
    animal_id: animalData?.animal_id,
    animal_name: animalData?.animal_name,
    animal_description: animalData?.animal_description || animalData?.description,
    date_of_birth: animalData?.date_of_birth,
    gender: animalData?.gender,
    environment_id: animalData?.environment_id,
    environment_description: animalData?.environment_description,
    animal_created_at: animalData?.animal_created_at,
    animal_modified_at: animalData?.animal_modified_at,
    environment_created_at: animalData?.environment_created_at,
    environment_modified_at: animalData?.environment_modified_at,
  };
}

export const fetchAnimal = async (animalId: string): Promise<Animal> => {
  try {
    const backendAnimalId = getBackendAnimalId(animalId);
    const animalName = getBackendAnimalName(animalId);
    
    const response = await getAnimalProfileApi(animalName, backendAnimalId);
    
    // Handle different response formats
    let animalData: any = response;
    if (response && (response as any).data) {
      animalData = (response as any).data;
    }
    
    return transformAnimalProfileData(animalData, animalId, 'Giant Anteater');
  } catch (error) {
    console.error('Error fetching animal profile:', error);
    throw error;
  }
};

/**
 * Fetch animal profile by explicit backend identifiers.
 * GET /api/v1/animal/:animal_name/:animal_id/profile
 */
export const fetchAnimalProfileByBackend = async (animalName: string, animalId: string): Promise<Animal> => {
  const response = await getAnimalProfileApi(animalName, animalId);
  let animalData: any = response;
  if (response && (response as any).data) animalData = (response as any).data;
  return transformAnimalProfileData(animalData, animalId);
};

/**
 * Create animal profile
 * POST /api/v1/animal/profile
 */
export const createAnimalProfile = async (frontendAnimalId: string, data: {
  animal_id?: string;
  animal_name?: string;
  date_of_birth?: string;
  gender?: string;
  environment_id?: string;
  description?: string;
}): Promise<any> => {
  const backendAnimalId = data.animal_id || getBackendAnimalId(frontendAnimalId);
  const animalName = data.animal_name || getBackendAnimalName(frontendAnimalId);

  return await createAnimalProfileApi({
    animal_id: backendAnimalId,
    animal_name: animalName,
    date_of_birth: data.date_of_birth,
    gender: data.gender,
    environment_id: data.environment_id,
    description: data.description,
  });
};

/**
 * Update animal profile
 * PUT /api/v1/animal/:animal_name/:animal_id/profile
 */
export const updateAnimalProfile = async (frontendAnimalId: string, data: {
  date_of_birth?: string;
  gender?: string;
  environment_id?: string;
  animal_description?: string;
  environment_description?: string;
}): Promise<any> => {
  const backendAnimalId = getBackendAnimalId(frontendAnimalId);
  const animalName = getBackendAnimalName(frontendAnimalId);
  return await updateAnimalProfileApi(animalName, backendAnimalId, data);
};

/**
 * Delete animal profile
 * DELETE /api/v1/animal/:animal_name/:animal_id/profile
 */
export const deleteAnimalProfile = async (frontendAnimalId: string): Promise<any> => {
  const backendAnimalId = getBackendAnimalId(frontendAnimalId);
  return await deleteAnimalProfileApi(backendAnimalId);
};

/**
 * Fetch video metadata for a specific event
 * This can use the timeline endpoint or behaviors endpoint
 * For now, we'll fetch from timeline and find the event
 */
export const fetchVideoMetadata = async (eventId: string): Promise<BehaviorEvent> => {
  try {
    // This is a bit tricky - we need to find the event by ID
    // For now, we'll need to fetch a date range and find it
    // In a real implementation, there might be a specific endpoint for this
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    const startDate = sevenDaysAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];
    
    const animalId = getBackendAnimalId('giant-anteater');
    const response = await getAnteaterTimelineApi(animalId, startDate, endDate);
    
    // Handle different response formats
    let events: any[] = [];
    if (Array.isArray(response)) {
      events = response;
    } else if (response && (response as any).data && Array.isArray((response as any).data)) {
      events = (response as any).data;
    } else if (response && (response as any).events && Array.isArray((response as any).events)) {
      events = (response as any).events;
    }
    
    // Transform and find event
    const transformedEvents = events.map(transformBehaviorEvent);
    const event = transformedEvents.find(e => e.id === eventId);
    
    if (!event) {
  throw new Error('Video not found');
    }
    
    return event;
  } catch (error) {
    console.error('Error fetching video metadata:', error);
    throw error;
  }
};

/**
 * Generate a report
 * Uses the reports generate endpoint
 */
export const generateReport = async (
  config: ReportConfig,
  format: ExportFormat,
  animalId?: string
): Promise<GeneratedReport> => {
  // Get the backend animal ID (use provided animalId or default to 'giant-anteater')
  const backendAnimalId = getBackendAnimalId(animalId || 'giant-anteater');
  
  // Map the report config to the backend format
  const behaviorType = config.options.specific_behavior || config.behaviors[0];
  const requestData = {
    animal_ids: [backendAnimalId], // Use the correct animal ID from route
    startDate: config.start_date,
    endDate: config.end_date,
    behaviour: behaviorType ? getBackendBehaviorType(behaviorType) : 'RECUMBENT',
  };
  
  console.log('📊 Generating report with data:', requestData);
  
  const result = await generateReportApi(requestData);
  
  console.log('📥 Report generation response:', result);
  
  // The backend returns: { count, download_url, report_id, status }
  // Map the response to our GeneratedReport format
  // Backend returns: { count, download_url, report_id, status }
  return {
    report_id: result.report_id || (result as any).id || '',
    download_url: result.download_url || '',
    count: result.count || 0,
    status: result.status || 'success',
    // Legacy fields for backward compatibility
    id: result.report_id || (result as any).id,
    config,
    generated_at: new Date().toISOString(),
    format,
  };
};

/**
 * Fetch available date range from backend
 * Uses the date-range endpoint
 */
/**
 * Fetch available date range from timeline API ONLY
 * No separate date-range endpoint - uses timeline API directly
 */
export const fetchDateRange = async (): Promise<{ startDate: string; endDate: string }> => {
  // Default date range with actual data (October 2025 based on user's data)
  const defaultRange = {
    startDate: '2025-10-01',
    endDate: '2025-10-30',
  };
  
  try {
    // Get date range from timeline API with a wide range to get actual available dates
    const backendAnimalId = getBackendAnimalId('giant-anteater');
    const startRange = '2025-01-01';
    const endRange = '2025-12-31';
    
    console.log('🔍 Fetching date range from timeline API with range:', { startRange, endRange });
    
    const timelineResponse = await getAnteaterTimelineApi(
      backendAnimalId,
      startRange,
      endRange
    );
    
    console.log('📦 Timeline API response for date range:', timelineResponse);
    
    // Extract date range from timeline response
    if (timelineResponse && typeof timelineResponse === 'object' && !Array.isArray(timelineResponse)) {
      // Check if it's an error response
      if ((timelineResponse as any).error) {
        console.log('⚠️ Timeline API returned error:', (timelineResponse as any).error);
        console.log('📅 Using default date range:', defaultRange);
        return defaultRange;
      }

      // Prefer deriving the real range from returned timeline events (backend often echoes query dates)
      const timeline = (timelineResponse as any).timeline;
      if (Array.isArray(timeline) && timeline.length > 0) {
        const parseToDate = (v: unknown): Date | null => {
          if (!v || typeof v !== 'string') return null;
          // Handles "YYYY-MM-DD HH:mm:ss" and ISO strings
          const d = v.includes('T') ? new Date(v) : new Date(v.replace(' ', 'T'));
          return Number.isNaN(d.getTime()) ? null : d;
        };

        let min: Date | null = null;
        let max: Date | null = null;
        for (const ev of timeline) {
          const s = parseToDate(ev?.start_datetime);
          const e = parseToDate(ev?.end_datetime);
          const candidates = [s, e].filter(Boolean) as Date[];
          for (const c of candidates) {
            if (!min || c.getTime() < min.getTime()) min = c;
            if (!max || c.getTime() > max.getTime()) max = c;
          }
        }

        if (min && max) {
          const result = {
            startDate: min.toISOString().slice(0, 10),
            endDate: max.toISOString().slice(0, 10),
          };
          console.log('✅ Derived date range from timeline events:', result);
          return result;
        }
      }

      // Fallback: use start_date/end_date if present
      if ((timelineResponse as any).start_date && (timelineResponse as any).end_date) {
        const result = {
          startDate: (timelineResponse as any).start_date,
          endDate: (timelineResponse as any).end_date,
        };
        console.log('✅ Using start_date/end_date from timeline response:', result);
        return result;
      }
    }
    
    // Final fallback: use default range
    console.log('📅 Using default date range:', defaultRange);
    return defaultRange;
  } catch (error) {
    console.error('Error fetching date range:', error);
    console.log('📅 Using default date range due to error:', defaultRange);
    return defaultRange;
  }
};

/**
 * Send chat query
 * Note: This endpoint is not in the backend API yet, so keeping mock for now
 */
export const sendChatQuery = async (
  query: string,
  _conversationId?: string
): Promise<{ response: string; conversationId: string }> => {
  // TODO: Replace with real API call when backend endpoint is available
  // For now, keeping mock implementation
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

/**
 * Download a generated report
 * Uses the reports download endpoint
 */

