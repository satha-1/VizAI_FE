import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../components/atoms/Card';
import { Tabs, TabsList, TabsTrigger } from '../components/atoms/Tabs';
import { SkeletonChart } from '../components/atoms/Skeleton';
import { EmptyState } from '../components/atoms/EmptyState';
import { ErrorState } from '../components/atoms/ErrorState';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { Modal } from '../components/atoms/Modal';
import { AnimalProfileCard } from '../components/organisms/AnimalProfileCard';
import { useBehaviorSummary, useAnimal, useBehaviorEvents } from '../api/hooks';
import { useDateRange } from '../context/DateRangeContext';
import { useToast } from '../components/molecules/Toast';
import { getBehaviorColor, formatDuration } from '../utils/formatting';
import { BehaviorType, BehaviorEvent } from '../types';
import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BarChart3, PieChartIcon, Calendar, ArrowLeft, Clock, Camera, Footprints, Bed, Hand, User, Play, Video } from 'lucide-react';
import { formatTimestampForTimeline, formatTimestampFull } from '../utils/timezone';

const behaviorIcons: Record<string, typeof Footprints> = {
  Pacing: Footprints,
  Recumbent: Bed,
  Scratching: Hand,
  'Self-directed': User,
};

const getBehaviorIcon = (behavior: string): typeof Footprints => {
  return behaviorIcons[behavior] || Footprints;
};

export function DashboardPage() {
  const { animalId: routeAnimalId } = useParams<{ animalId: string }>();
  const animalId = routeAnimalId || 'giant-anteater'; // Fallback for backward compatibility
  const { dateRange } = useDateRange();
  const { showToast: _showToast } = useToast();
  const [durationView, setDurationView] = useState<'bar' | 'pie'>('bar');
  const [selectedBehavior, setSelectedBehavior] = useState<BehaviorType | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<BehaviorEvent | null>(null);

  const { data: animal, isLoading: isLoadingAnimal } = useAnimal(animalId);
  const { data: summary, isLoading: isLoadingSummary, error, refetch } = useBehaviorSummary(
    dateRange.preset,
    dateRange.startDate,
    dateRange.endDate,
    true,
    animalId
  );
  
  // Note: Date range is initialized from timeline API via DateRangeContext's fetchDateRange()
  // which extracts start_date and end_date from the timeline API response

  // Fetch events for selected behavior
  const { data: behaviorEvents, isLoading: isLoadingEvents } = useBehaviorEvents(
    dateRange.startDate,
    dateRange.endDate,
    selectedBehavior || undefined,
    !!selectedBehavior,
    animalId
  );

  const handleBarClick = (behavior: BehaviorType) => {
    setSelectedBehavior(behavior);
  };

  const handleBackToChart = () => {
    setSelectedBehavior(null);
  };

  const handleViewEvent = (event: BehaviorEvent) => {
    setSelectedEvent(event);
  };

  // Prepare chart data - show all behaviors from summary
  const behaviorCountData = summary?.behaviors
    ?.map((b) => ({
      name: b.behavior_type,
      count: b.count,
      fill: getBehaviorColor(b.behavior_type),
    })) || [];
  
  // Debug logging
  useEffect(() => {
    if (summary) {
      console.log('📊 Dashboard Summary:', {
        total_behaviors: summary.total_behaviors,
        behaviors_count: summary.behaviors?.length,
        behaviors: summary.behaviors?.map(b => ({ type: b.behavior_type, count: b.count })),
        heatmap_entries: summary.hourly_heatmap?.length,
      });
      console.log('📊 Behavior Count Data for chart:', behaviorCountData);
    }
  }, [summary, behaviorCountData]);

  const durationData = summary?.behaviors.map((b) => ({
    name: b.behavior_type,
    duration: b.total_duration_seconds,
    percentage: b.percentage_of_total,
    fill: getBehaviorColor(b.behavior_type),
  })) || [];

  const totalDuration = summary?.total_monitored_seconds || 0;

  if (error) {
    return (
      <ErrorState
        title="Failed to load dashboard"
        message="We couldn't load the behavior data. Please try again."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Animal Profile Card */}
      {animal && (
        <AnimalProfileCard
          animal={animal}
          summary={summary}
          isLoading={isLoadingAnimal || isLoadingSummary}
        />
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Behavior Count Chart / Timeline View */}
        <Card>
          <CardHeader>
            {selectedBehavior ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToChart}
                    leftIcon={<ArrowLeft className="w-4 h-4" />}
                  >
                    Back to Chart
                  </Button>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Icon = getBehaviorIcon(selectedBehavior);
                      return <Icon className="w-5 h-5" style={{ color: getBehaviorColor(selectedBehavior) }} />;
                    })()}
                    <CardTitle>{selectedBehavior} Events</CardTitle>
                  </div>
                </div>
                <Badge variant="info" size="md">
                  {behaviorEvents?.length || 0} events
                </Badge>
              </div>
            ) : (
              <>
                <CardTitle>Behavior Count</CardTitle>
                <p className="text-sm text-gray-500">Click a bar to view events</p>
              </>
            )}
          </CardHeader>
          <CardContent>
            {selectedBehavior ? (
              // Timeline View
              <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin pr-2">
                {isLoadingEvents ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex gap-3 p-3 border border-gray-100 rounded-lg animate-pulse">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-1/3" />
                          <div className="h-3 bg-gray-200 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : behaviorEvents && behaviorEvents.length > 0 ? (
                  behaviorEvents.map((event) => (
                    <BehaviorEventItem key={event.id} event={event} onView={handleViewEvent} />
                  ))
                ) : (
                  <EmptyState
                    icon={Calendar}
                    title={`No ${selectedBehavior} events found`}
                    description="Try selecting a different date range"
                  />
                )}
              </div>
            ) : (
              // Chart View
              <>
                {isLoadingSummary ? (
                  <div className="h-64">
                    <SkeletonChart />
                  </div>
                ) : behaviorCountData.length === 0 ? (
                  <EmptyState
                    icon={Calendar}
                    title="No behavior data"
                    description="Try selecting a different date range"
                  />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={behaviorCountData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="name"
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={60}
                        tick={{ fontSize: 12, fill: '#374151' }}
                        minTickGap={0}
                        tickLine={false}
                        axisLine={{ stroke: '#E5E7EB' }}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: '#374151' }}
                        tickLine={false}
                        axisLine={{ stroke: '#E5E7EB' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                        formatter={(value: number) => [`${value} occurrences`, 'Count']}
                      />
                      <Bar
                        dataKey="count"
                        radius={[4, 4, 0, 0]}
                        cursor="pointer"
                        onClick={(data) => handleBarClick(data.name as BehaviorType)}
                        label={{
                          position: 'top',
                          fill: '#374151',
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        {behaviorCountData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Behavior Duration Chart */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Behavior Duration</CardTitle>
            <Tabs defaultValue="bar" value={durationView} onValueChange={(v) => setDurationView(v as 'bar' | 'pie')}>
              <TabsList className="bg-gray-100">
                <TabsTrigger value="bar">
                  <BarChart3 className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="pie">
                  <PieChartIcon className="w-4 h-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <div className="h-64">
                <SkeletonChart />
              </div>
            ) : durationData.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No behavior data"
                description="Try selecting a different date range"
              />
            ) : (
              <>
                {durationView === 'bar' ? (
                  <div className="space-y-4">
                    {/* Stacked horizontal bar */}
                    <div className="relative h-12 rounded-lg overflow-hidden bg-gray-100">
                      {durationData.map((item, index) => {
                        const prevWidths = durationData
                          .slice(0, index)
                          .reduce((acc, d) => acc + d.percentage, 0);
                        return (
                          <div
                            key={item.name}
                            className="absolute top-0 h-full transition-all duration-300"
                            style={{
                              left: `${prevWidths}%`,
                              width: `${item.percentage}%`,
                              backgroundColor: item.fill,
                            }}
                            title={`${item.name}: ${formatDuration(item.duration)} (${item.percentage.toFixed(1)}%)`}
                          />
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div className="grid grid-cols-2 gap-3">
                      {durationData.map((item) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.fill }}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-charcoal truncate">
                              {item.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDuration(item.duration)} ({item.percentage.toFixed(1)}%)
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-500">
                        Total monitored time: <span className="font-medium text-charcoal">{formatDuration(totalDuration)}</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={durationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="percentage"
                        nameKey="name"
                        label={({ percentage }) => `${percentage.toFixed(0)}%`}
                        labelLine={false}
                      >
                        {durationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, _name: string, props) => [
                          `${formatDuration(props.payload.duration)} (${value.toFixed(1)}%)`,
                          props.payload.name,
                        ]}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) => (
                          <span className="text-sm text-charcoal">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>24-Hour Activity Heatmap</CardTitle>
          <p className="text-sm text-gray-500">Behavior frequency by hour of day</p>
        </CardHeader>
        <CardContent>
          {isLoadingSummary ? (
            <div className="h-48">
              <SkeletonChart />
            </div>
          ) : (
            <HeatmapChart data={summary?.hourly_heatmap || []} />
          )}
        </CardContent>
      </Card>

      {/* Video Modal */}
      {selectedEvent && (
        <VideoModal
          event={selectedEvent}
          relatedEvents={behaviorEvents?.filter(e => e.id !== selectedEvent.id).slice(0, 3) || []}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}

// Heatmap Component
interface HeatmapProps {
  data: Array<{
    behavior_type: BehaviorType;
    hour: number;
    count: number;
    duration_seconds: number;
  }>;
}

function HeatmapChart({ data }: HeatmapProps) {
  const behaviors: BehaviorType[] = Array.from(
    new Set(data.map((d) => d.behavior_type))
  ).sort((a, b) => String(a).localeCompare(String(b)));
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Find max count for scaling
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const getIntensity = (behavior: BehaviorType, hour: number): number => {
    const item = data.find((d) => d.behavior_type === behavior && d.hour === hour);
    return item ? item.count / maxCount : 0;
  };

  const getCellData = (behavior: BehaviorType, hour: number) => {
    return data.find((d) => d.behavior_type === behavior && d.hour === hour);
  };

  const getColor = (behavior: BehaviorType, intensity: number): string => {
    const baseColor = getBehaviorColor(behavior);
    if (intensity === 0) return '#F9FAFB'; // Off White from palette

    // Convert hex to RGB and apply intensity
    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);

    // Mix with white based on intensity
    const mix = 1 - intensity * 0.8;
    const newR = Math.round(r + (255 - r) * mix);
    const newG = Math.round(g + (255 - g) * mix);
    const newB = Math.round(b + (255 - b) * mix);

    return `rgb(${newR}, ${newG}, ${newB})`;
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Hour labels */}
        <div className="flex mb-2">
          <div className="w-28 flex-shrink-0" />
          {hours.map((hour) => (
            <div
              key={hour}
              className="flex-1 text-center text-xs text-gray-500"
            >
              {hour.toString().padStart(2, '0')}
            </div>
          ))}
        </div>

        {/* Heatmap rows */}
        {behaviors.map((behavior) => (
          <div key={behavior} className="flex items-center mb-1">
            <div className="w-28 flex-shrink-0 text-sm text-charcoal font-medium pr-3 text-right">
              {behavior}
            </div>
            <div className="flex-1 flex gap-0.5">
              {hours.map((hour) => {
                const intensity = getIntensity(behavior, hour);
                const cellData = getCellData(behavior, hour);

                return (
                  <div
                    key={hour}
                    className="flex-1 h-8 rounded-sm cursor-pointer transition-transform hover:scale-110 hover:z-10"
                    style={{ backgroundColor: getColor(behavior, intensity) }}
                    title={cellData
                      ? `${behavior} at ${hour}:00\nCount: ${cellData.count}\nDuration: ${formatDuration(cellData.duration_seconds)}`
                      : `${behavior} at ${hour}:00\nNo activity`
                    }
                  />
                );
              })}
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center justify-end mt-4 gap-2">
          <span className="text-xs text-gray-500">Less</span>
          <div className="flex gap-0.5">
            {[0, 0.25, 0.5, 0.75, 1].map((intensity) => (
              <div
                key={intensity}
                className="w-4 h-4 rounded-sm"
                style={{ backgroundColor: getColor('Pacing', intensity) }}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">More</span>
        </div>
      </div>
    </div>
  );
}

// Behavior Event Item Component for Timeline View
interface BehaviorEventItemProps {
  event: BehaviorEvent;
}

function BehaviorEventItem({ event, onView }: BehaviorEventItemProps & { onView: (event: BehaviorEvent) => void }) {
  const Icon = getBehaviorIcon(event.behavior_type);
  const color = getBehaviorColor(event.behavior_type);

  return (
    <div className="flex gap-3 p-3 border border-gray-100 rounded-lg hover:border-gray-200 hover:shadow-sm transition-all">
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-medium text-charcoal">{event.behavior_type}</h4>
          <Badge variant="info" size="sm">
            <Clock className="w-3 h-3 mr-1" />
            {formatDuration(event.duration_seconds)}
          </Badge>
        </div>
        <p className="text-xs text-gray-500 mb-1">
          {formatTimestampForTimeline(event.start_timestamp)}
        </p>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Camera className="w-3 h-3" />
            {event.camera_source}
          </span>
          <span>
            Confidence: {(event.confidence_score * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* View Button */}
      <Button
        size="sm"
        variant="secondary"
        onClick={() => onView(event)}
        leftIcon={<Play className="w-3 h-3" />}
      >
        View
      </Button>
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
  const videoRef = useRef<HTMLVideoElement>(null);

  // Update video playback rate when it changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

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
                    ref={videoRef}
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
                    const Icon = getBehaviorIcon(related.behavior_type);
                    return (
                      <div
                        key={related.id}
                        className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                      >
                        <Icon
                          className="w-4 h-4"
                          style={{ color: getBehaviorColor(related.behavior_type) }}
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

