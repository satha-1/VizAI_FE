import { Card } from '../atoms/Card';
import { StatusBadge } from '../atoms/Badge';
import { Skeleton } from '../atoms/Skeleton';
import { Animal, DashboardSummary } from '../../types';
import { formatDuration } from '../../utils/formatting';
import { formatRelativeTime } from '../../utils/timezone';
import { Clock, Activity, TrendingUp } from 'lucide-react';

interface AnimalProfileCardProps {
  animal: Animal;
  summary?: DashboardSummary;
  isLoading?: boolean;
}

export function AnimalProfileCard({ animal, summary, isLoading }: AnimalProfileCardProps) {
  return (
    <Card className="mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        {/* Animal info - Enhanced to match spec */}
        <div className="flex items-center gap-4 flex-1">
          <div className="w-20 h-20 rounded-xl bg-primary/10 overflow-hidden flex-shrink-0 border-2 border-primary/20">
            {animal.image_url ? (
              <img
                src={animal.image_url}
                alt={animal.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                <span className="text-3xl">🦡</span>
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-charcoal">
                {animal.name}
              </h1>
              <StatusBadge status={animal.status} size="md" />
            </div>
            <p className="text-lg font-medium text-gray-700 mb-1">
              {animal.species}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <span className="font-medium">Age:</span> {animal.age} years
              </span>
              <span className="text-gray-400">•</span>
              <span className="flex items-center gap-1">
                <span className="font-medium">Sex:</span> {animal.sex}
              </span>
              <span className="text-gray-400">•</span>
              <span className="flex items-center gap-1">
                <span className="font-medium">Enclosure:</span> {animal.enclosure}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              <span>Last updated: {formatRelativeTime(animal.last_updated)}</span>
            </div>
          </div>
        </div>

        {/* Quick metrics */}
        <div className="grid grid-cols-3 gap-4 lg:gap-6">
          {isLoading ? (
            <>
              <Skeleton className="h-16 w-24" />
              <Skeleton className="h-16 w-24" />
              <Skeleton className="h-16 w-24" />
            </>
          ) : summary ? (
            <>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-gray-500 mb-1">
                  <Activity className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wider">Total</span>
                </div>
                <p className="text-2xl font-semibold text-charcoal">{summary.total_behaviors}</p>
                <p className="text-xs text-gray-500">behaviors</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-gray-500 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wider">Top</span>
                </div>
                <p className="text-lg font-semibold text-primary">{summary.most_frequent_behavior}</p>
                <p className="text-xs text-gray-500">most frequent</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-gray-500 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wider">Time</span>
                </div>
                <p className="text-lg font-semibold text-charcoal">
                  {formatDuration(summary.total_monitored_seconds)}
                </p>
                <p className="text-xs text-gray-500">monitored</p>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

