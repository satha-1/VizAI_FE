// Behavior Types - dynamically determined from API, but we need a base type
// The actual types will be determined from the API response
export type BehaviorType = string; // Made dynamic to support any behavior from API

export interface BehaviorEvent {
  id: string;
  behavior_type: BehaviorType;
  /**
   * Raw behavior string exactly as returned by backend timeline API.
   * Example: "PACING_START", "PACING_STOPPED", "NON-RECUMBENT"
   */
  raw_behavior_type?: string;
  /**
   * Raw video URL exactly as returned by backend (often s3://...)
   */
  raw_video_url?: string;
  start_timestamp: string; // ISO 8601
  end_timestamp: string;
  duration_seconds: number;
  camera_source: string;
  video_url: string;
  thumbnail_url: string;
  confidence_score: number; // 0–1
  environmental_context?: {
    temperature?: number;
    visitor_count?: number;
    [key: string]: unknown;
  };
}

export interface BehaviorSummary {
  behavior_type: BehaviorType;
  count: number;
  total_duration_seconds: number;
  average_duration_seconds: number;
  min_duration_seconds: number;
  max_duration_seconds: number;
  percentage_of_total: number;
}

export interface DashboardSummary {
  total_behaviors: number;
  most_frequent_behavior: BehaviorType;
  total_monitored_seconds: number;
  behaviors: BehaviorSummary[];
  hourly_heatmap: HourlyHeatmapData[];
}

export interface HourlyHeatmapData {
  behavior_type: BehaviorType;
  hour: number;
  count: number;
  duration_seconds: number;
}

// Animal Types
export interface Animal {
  id: string;
  species: string;
  name: string;
  age: number;
  sex: 'Male' | 'Female';
  enclosure: string;
  status: 'Active' | 'Coming Soon' | 'Deleted' | 'Resting' | 'Feeding';
  last_updated: string;
  image_url?: string;
  // Additional fields from backend
  animal_id?: string;
  animal_name?: string;
  animal_description?: string;
  date_of_birth?: string;
  gender?: string; // Backend uses "FeMale" format
  environment_id?: string;
  environment_description?: string;
  animal_created_at?: string;
  animal_modified_at?: string;
  environment_created_at?: string;
  environment_modified_at?: string;
}

// Report Types
export type ReportType =
  | 'daily_summary'
  | 'weekly_monthly_trend'
  | 'behavior_specific'
  | 'welfare_assessment';

export type ExportFormat = 'pdf' | 'excel' | 'powerpoint';

export interface ReportConfig {
  report_type: ReportType;
  start_date: string;
  end_date: string;
  behaviors: BehaviorType[];
  options: {
    include_duration_chart?: boolean;
    include_count_chart?: boolean;
    include_compliance?: boolean;
    include_diversity_index?: boolean;
    specific_behavior?: BehaviorType;
  };
}

export interface GeneratedReport {
  report_id: string;
  download_url: string;
  count: number;
  status: string;
  // Legacy fields for backward compatibility
  id?: string;
  config?: ReportConfig;
  generated_at?: string;
  format?: ExportFormat;
}

// Chat Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Date Range Types
export type DateRangePreset = 'today' | 'last_7_days' | 'last_30_days' | 'custom';

export interface DateRange {
  preset: DateRangePreset;
  startDate: string;
  endDate: string;
}

// User Role Types
export type UserRole = 'Zoo Manager' | 'Veterinarian' | 'Researcher' | 'Animal Keeper';

// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: UserRole;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Filter Types
export interface TimelineFilters {
  behaviors: BehaviorType[];
  duration_min?: number;
  duration_max?: number;
  time_of_day: ('morning' | 'afternoon' | 'evening' | 'night')[];
  camera_source?: string;
  start_date?: string;
  end_date?: string;
}

