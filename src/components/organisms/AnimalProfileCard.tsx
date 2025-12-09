import { Card } from '../atoms/Card';
import { StatusBadge } from '../atoms/Badge';
import { Skeleton } from '../atoms/Skeleton';
import { Animal, DashboardSummary } from '../../types';
import { formatDuration } from '../../api/mockData';
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
        {/* Animal info */}
        <div className="flex items-center gap-4 flex-1">
          <div className="w-16 h-16 rounded-xl bg-primary/10 overflow-hidden flex-shrink-0">
            {animal.image_url ? (
              <img
                src={animal.image_url}
                alt={animal.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-2xl">🦡</span>
              </div>
            )}
          </div>
          
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-semibold text-charcoal">
                {animal.name} – {animal.species}
              </h1>
              <StatusBadge status={animal.status} />
            </div>
            <p className="text-sm text-gray-500">
              Age {animal.age} • {animal.sex} • Enclosure {animal.enclosure}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Last updated: {formatRelativeTime(animal.last_updated)}
            </p>
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

