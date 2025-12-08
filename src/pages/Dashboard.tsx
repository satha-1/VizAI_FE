import { useNavigate } from 'react-router-dom';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/atoms/Tabs';
import { SkeletonChart } from '../components/atoms/Skeleton';
import { EmptyState } from '../components/atoms/EmptyState';
import { ErrorState } from '../components/atoms/ErrorState';
import { AnimalProfileCard } from '../components/organisms/AnimalProfileCard';
import { useBehaviorSummary, useAnimal } from '../api/hooks';
import { useDateRange } from '../context/DateRangeContext';
import { behaviorColors, formatDuration } from '../api/mockData';
import { BehaviorType } from '../types';
import { useState } from 'react';
import { BarChart3, PieChartIcon, Calendar } from 'lucide-react';

export function DashboardPage() {
  const navigate = useNavigate();
  const { dateRange } = useDateRange();
  const [durationView, setDurationView] = useState<'bar' | 'pie'>('bar');

  const { data: animal, isLoading: isLoadingAnimal } = useAnimal('giant-anteater');
  const { data: summary, isLoading: isLoadingSummary, error, refetch } = useBehaviorSummary(
    dateRange.preset,
    dateRange.startDate,
    dateRange.endDate
  );

  const handleBarClick = (behavior: BehaviorType) => {
    navigate(`/animals/giant-anteater/timeline?behavior=${behavior}`);
  };

  // Prepare chart data
  const behaviorCountData = summary?.behaviors.map((b) => ({
    name: b.behavior_type,
    count: b.count,
    fill: behaviorColors[b.behavior_type],
  })) || [];

  const durationData = summary?.behaviors.map((b) => ({
    name: b.behavior_type,
    duration: b.total_duration_seconds,
    percentage: b.percentage_of_total,
    fill: behaviorColors[b.behavior_type],
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
        {/* Behavior Count Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Behavior Count</CardTitle>
            <p className="text-sm text-gray-500">Click a bar to view in timeline</p>
          </CardHeader>
          <CardContent>
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
                    tick={{ fontSize: 12, fill: '#374151' }}
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
          </CardContent>
        </Card>

        {/* Behavior Duration Chart */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Behavior Duration</CardTitle>
            <Tabs value={durationView} onValueChange={(v) => setDurationView(v as 'bar' | 'pie')}>
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
                        label={({ name, percentage }) => `${percentage.toFixed(0)}%`}
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
  const behaviors: BehaviorType[] = ['Pacing', 'Recumbent', 'Scratching', 'Self-directed'];
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
    const baseColor = behaviorColors[behavior];
    if (intensity === 0) return '#F3F4F6';
    
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

