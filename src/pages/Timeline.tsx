import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Filter,
  Play,
  X,
  RotateCcw,
  Save,
  Clock,
  Sun,
  Sunset,
  Moon,
  Sunrise,
  Video,
  Camera,
  Footprints,
  Bed,
  Hand,
  User,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { Tabs, TabsList, TabsTrigger } from '../components/atoms/Tabs';
import { Skeleton } from '../components/atoms/Skeleton';
import { EmptyState } from '../components/atoms/EmptyState';
import { ErrorState } from '../components/atoms/ErrorState';
import { Modal } from '../components/atoms/Modal';
import { Dropdown } from '../components/molecules/Dropdown';
import { useToast } from '../components/molecules/Toast';
import { useBehaviorEvents } from '../api/hooks';
import { useDateRange } from '../context/DateRangeContext';
import { BehaviorType, BehaviorEvent, TimelineFilters } from '../types';
import { behaviorColors, formatDuration } from '../api/mockData';
import { formatTimestampForTimeline, formatTimestampFull, getZooHour } from '../utils/timezone';

const behaviorIcons: Record<BehaviorType, typeof Footprints> = {
  Pacing: Footprints,
  Recumbent: Bed,
  Scratching: Hand,
  'Self-directed': User,
};

const timeOfDayOptions = [
  { key: 'morning', label: 'Morning', icon: Sunrise, range: '06:00–12:00' },
  { key: 'afternoon', label: 'Afternoon', icon: Sun, range: '12:00–18:00' },
  { key: 'evening', label: 'Evening', icon: Sunset, range: '18:00–00:00' },
  { key: 'night', label: 'Night', icon: Moon, range: '00:00–06:00' },
] as const;

const cameraSources = [
  { value: 'all', label: 'All Cameras' },
  { value: 'Fixed Cam 1', label: 'Fixed Cam 1' },
  { value: 'Fixed Cam 2', label: 'Fixed Cam 2' },
  { value: 'PTZ Cam 1', label: 'PTZ Cam 1' },
  { value: 'PTZ Cam 2', label: 'PTZ Cam 2' },
];

const durationPresets = [
  { value: 'all', label: 'Any duration' },
  { value: 'short', label: '< 30 seconds' },
  { value: 'medium', label: '30s – 5 min' },
  { value: 'long', label: '> 5 minutes' },
];

export function TimelinePage() {
  const [searchParams] = useSearchParams();
  const { dateRange } = useDateRange();
  const { showToast } = useToast();

  // Filters state
  const [filters, setFilters] = useState<TimelineFilters>(() => {
    const behaviorParam = searchParams.get('behavior');
    return {
      behaviors: behaviorParam ? [behaviorParam as BehaviorType] : ['Pacing', 'Recumbent', 'Scratching', 'Self-directed'],
      time_of_day: ['morning', 'afternoon', 'evening', 'night'],
      camera_source: undefined,
    };
  });

  const [durationFilter, setDurationFilter] = useState('all');
  const [cameraFilter, setCameraFilter] = useState('all');
  const [zoomLevel, setZoomLevel] = useState<'hourly' | 'daily' | 'weekly'>('daily');
  const [selectedEvent, setSelectedEvent] = useState<BehaviorEvent | null>(null);

  // Sync behavior filter from URL
  useEffect(() => {
    const behaviorParam = searchParams.get('behavior');
    if (behaviorParam) {
      setFilters(prev => ({
        ...prev,
        behaviors: [behaviorParam as BehaviorType],
      }));
    }
  }, [searchParams]);

  // Fetch data
  const { data: events, isLoading, error, refetch } = useBehaviorEvents(
    dateRange.startDate,
    dateRange.endDate
  );

  // Filter events
  const filteredEvents = useMemo(() => {
    if (!events) return [];

    return events.filter((event) => {
      // Behavior filter
      if (!filters.behaviors.includes(event.behavior_type)) return false;

      // Camera filter
      if (cameraFilter !== 'all' && event.camera_source !== cameraFilter) return false;

      // Duration filter
      if (durationFilter === 'short' && event.duration_seconds >= 30) return false;
      if (durationFilter === 'medium' && (event.duration_seconds < 30 || event.duration_seconds > 300)) return false;
      if (durationFilter === 'long' && event.duration_seconds <= 300) return false;

      // Time of day filter (using zoo timezone)
      const hour = getZooHour(event.start_timestamp);
      const timeOfDay = 
        hour >= 6 && hour < 12 ? 'morning' :
        hour >= 12 && hour < 18 ? 'afternoon' :
        hour >= 18 ? 'evening' : 'night';
      
      if (!filters.time_of_day.includes(timeOfDay)) return false;

      return true;
    });
  }, [events, filters, durationFilter, cameraFilter]);

  const toggleBehavior = (behavior: BehaviorType) => {
    setFilters((prev) => ({
      ...prev,
      behaviors: prev.behaviors.includes(behavior)
        ? prev.behaviors.filter((b) => b !== behavior)
        : [...prev.behaviors, behavior],
    }));
  };

  const toggleAllBehaviors = () => {
    const allBehaviors: BehaviorType[] = ['Pacing', 'Recumbent', 'Scratching', 'Self-directed'];
    setFilters((prev) => ({
      ...prev,
      behaviors: prev.behaviors.length === 4 ? [] : allBehaviors,
    }));
  };

  const toggleTimeOfDay = (time: typeof timeOfDayOptions[number]['key']) => {
    setFilters((prev) => ({
      ...prev,
      time_of_day: prev.time_of_day.includes(time)
        ? prev.time_of_day.filter((t) => t !== time)
        : [...prev.time_of_day, time],
    }));
  };

  const clearFilters = () => {
    setFilters({
      behaviors: ['Pacing', 'Recumbent', 'Scratching', 'Self-directed'],
      time_of_day: ['morning', 'afternoon', 'evening', 'night'],
    });
    setDurationFilter('all');
    setCameraFilter('all');
  };

  const handleSavePreset = () => {
    showToast('info', 'Preset saving coming in future phase');
  };

  if (error) {
    return (
      <ErrorState
        title="Failed to load timeline"
        message="We couldn't load the behavior events. Please try again."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar Filters */}
      <aside className="w-72 flex-shrink-0 hidden lg:block">
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Behavior Type */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-charcoal">Behavior Type</label>
                <button
                  onClick={toggleAllBehaviors}
                  className="text-xs text-primary hover:text-primary-dark"
                >
                  {filters.behaviors.length === 4 ? 'Clear all' : 'Select all'}
                </button>
              </div>
              <div className="space-y-2">
                {(['Pacing', 'Recumbent', 'Scratching', 'Self-directed'] as BehaviorType[]).map((behavior) => {
                  const Icon = behaviorIcons[behavior];
                  const isSelected = filters.behaviors.includes(behavior);
                  return (
                    <label
                      key={behavior}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors
                        ${isSelected ? 'bg-primary/5' : 'hover:bg-gray-50'}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleBehavior(behavior)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Icon className="w-4 h-4" style={{ color: behaviorColors[behavior] }} />
                      <span className="text-sm text-charcoal">{behavior}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Duration */}
            <div>
              <Dropdown
                label="Duration"
                options={durationPresets}
                value={durationFilter}
                onChange={setDurationFilter}
              />
            </div>

            {/* Time of Day */}
            <div>
              <label className="text-sm font-medium text-charcoal block mb-3">Time of Day</label>
              <div className="grid grid-cols-2 gap-2">
                {timeOfDayOptions.map(({ key, label, icon: Icon }) => {
                  const isSelected = filters.time_of_day.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleTimeOfDay(key)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
                        ${isSelected
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-charcoal hover:bg-gray-200'
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Camera Source */}
            <div>
              <Dropdown
                label="Camera Source"
                options={cameraSources}
                value={cameraFilter}
                onChange={setCameraFilter}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t border-gray-100">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                leftIcon={<RotateCcw className="w-4 h-4" />}
                onClick={clearFilters}
              >
                Clear
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                leftIcon={<Save className="w-4 h-4" />}
                onClick={handleSavePreset}
              >
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      </aside>

      {/* Main Timeline */}
      <div className="flex-1 min-w-0">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Timeline</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Showing {filteredEvents.length} behavior events
              </p>
            </div>
            <Tabs value={zoomLevel} onValueChange={(v) => setZoomLevel(v as typeof zoomLevel)}>
              <TabsList>
                <TabsTrigger value="hourly">Hourly</TabsTrigger>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-4 p-4 border border-gray-100 rounded-xl">
                    <Skeleton className="w-12 h-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-1/3" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                    <Skeleton className="w-32 h-20 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : filteredEvents.length === 0 ? (
              <EmptyState
                icon={Video}
                title="No behavior events found"
                description="Try adjusting your filters or selecting a different date range"
                action={{
                  label: 'Clear Filters',
                  onClick: clearFilters,
                }}
              />
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin pr-2">
                {filteredEvents.map((event) => (
                  <BehaviorEventCard
                    key={event.id}
                    event={event}
                    onViewVideo={() => setSelectedEvent(event)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Video Modal */}
      {selectedEvent && (
        <VideoModal
          event={selectedEvent}
          relatedEvents={filteredEvents.filter(e => e.id !== selectedEvent.id).slice(0, 3)}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}

// Behavior Event Card Component
interface BehaviorEventCardProps {
  event: BehaviorEvent;
  onViewVideo: () => void;
}

function BehaviorEventCard({ event, onViewVideo }: BehaviorEventCardProps) {
  const Icon = behaviorIcons[event.behavior_type];
  const color = behaviorColors[event.behavior_type];

  return (
    <div className="flex gap-4 p-4 border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all">
      {/* Icon */}
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon className="w-6 h-6" style={{ color }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-charcoal">{event.behavior_type}</h4>
          <Badge variant="info" size="sm">
            <Clock className="w-3 h-3 mr-1" />
            {formatDuration(event.duration_seconds)}
          </Badge>
        </div>
        <p className="text-sm text-gray-500 mb-2">
          {formatTimestampForTimeline(event.start_timestamp)}
        </p>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Camera className="w-3 h-3" />
            {event.camera_source}
          </span>
          <span>
            Confidence: {(event.confidence_score * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Thumbnail & Action */}
      <div className="flex-shrink-0 flex items-center gap-3">
        <div
          className="w-32 h-20 rounded-lg bg-gray-100 overflow-hidden cursor-pointer group"
          onClick={onViewVideo}
        >
          <div className="relative w-full h-full">
            <img
              src={event.thumbnail_url}
              alt={`${event.behavior_type} thumbnail`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Play className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
        <Button size="sm" onClick={onViewVideo} leftIcon={<Play className="w-4 h-4" />}>
          View
        </Button>
      </div>
    </div>
  );
}

// Video Modal Component
interface VideoModalProps {
  event: BehaviorEvent;
  relatedEvents: BehaviorEvent[];
  onClose: () => void;
}

function VideoModal({ event, relatedEvents, onClose }: VideoModalProps) {
  const { showToast } = useToast();
  const [playbackRate, setPlaybackRate] = useState(1);
  const [videoError, setVideoError] = useState(false);

  const handleDownload = () => {
    showToast('info', 'Download coming in later phase');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/animals/giant-anteater/timeline?event=${event.id}`
      );
      showToast('success', 'Link copied to clipboard');
    } catch {
      showToast('error', 'Failed to copy link');
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} size="xl" title="Behavior Video">
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <div className="relative aspect-video bg-charcoal rounded-xl overflow-hidden mb-4">
              {videoError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <Video className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm opacity-75 mb-3">Video could not be loaded</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setVideoError(false)}
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                <>
                  <video
                    className="w-full h-full object-contain"
                    controls
                    autoPlay
                    onError={() => setVideoError(true)}
                    poster={event.thumbnail_url}
                  >
                    <source src={event.video_url} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>

                  {/* Behavior label overlay */}
                  <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg">
                    <span className="text-white text-sm font-medium">
                      {event.behavior_type}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Video Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Playback Speed:</span>
                <select
                  value={playbackRate}
                  onChange={(e) => setPlaybackRate(Number(e.target.value))}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={handleDownload}>
                  Download Clip
                </Button>
                <Button variant="secondary" size="sm" onClick={handleCopyLink}>
                  Copy Share Link
                </Button>
              </div>
            </div>
          </div>

          {/* Metadata Panel */}
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-charcoal mb-3">Event Details</h4>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-gray-500">Behavior Type</dt>
                  <dd className="text-sm font-medium text-charcoal">{event.behavior_type}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Camera Source</dt>
                  <dd className="text-sm text-charcoal">{event.camera_source}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Start Time</dt>
                  <dd className="text-sm text-charcoal">{formatTimestampFull(event.start_timestamp)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">End Time</dt>
                  <dd className="text-sm text-charcoal">{formatTimestampFull(event.end_timestamp)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Duration</dt>
                  <dd className="text-sm font-medium text-charcoal">
                    {formatDuration(event.duration_seconds)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Confidence Score</dt>
                  <dd className="text-sm text-charcoal">
                    {(event.confidence_score * 100).toFixed(1)}%
                  </dd>
                </div>
              </dl>
            </div>

            {/* Environmental Context */}
            {event.environmental_context && (
              <div>
                <h4 className="text-sm font-medium text-charcoal mb-3">Environment</h4>
                <dl className="space-y-2">
                  {event.environmental_context.temperature && (
                    <div>
                      <dt className="text-xs text-gray-500">Temperature</dt>
                      <dd className="text-sm text-charcoal">
                        {event.environmental_context.temperature}°C
                      </dd>
                    </div>
                  )}
                  {event.environmental_context.visitor_count !== undefined && (
                    <div>
                      <dt className="text-xs text-gray-500">Visitor Count</dt>
                      <dd className="text-sm text-charcoal">
                        {event.environmental_context.visitor_count} visitors
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Related Behaviors */}
            {relatedEvents.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-charcoal mb-3">Related Behaviors</h4>
                <div className="space-y-2">
                  {relatedEvents.map((related) => {
                    const Icon = behaviorIcons[related.behavior_type];
                    return (
                      <div
                        key={related.id}
                        className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                      >
                        <Icon
                          className="w-4 h-4"
                          style={{ color: behaviorColors[related.behavior_type] }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-charcoal truncate">
                            {related.behavior_type}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDuration(related.duration_seconds)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

