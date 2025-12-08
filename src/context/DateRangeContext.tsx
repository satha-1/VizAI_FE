import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import { DateRange, DateRangePreset } from '../types';

interface DateRangeContextType {
  dateRange: DateRange;
  setPreset: (preset: DateRangePreset) => void;
  setCustomRange: (startDate: string, endDate: string) => void;
  formatDateRange: () => string;
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

const getDefaultDateRange = (): DateRange => {
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);
  
  return {
    preset: 'last_7_days',
    startDate: sevenDaysAgo.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0],
  };
};

const calculateDatesFromPreset = (preset: DateRangePreset): { startDate: string; endDate: string } => {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];
  let startDate: string;
  
  switch (preset) {
    case 'today':
      startDate = endDate;
      break;
    case 'last_7_days':
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);
      startDate = sevenDaysAgo.toISOString().split('T')[0];
      break;
    case 'last_30_days':
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      startDate = thirtyDaysAgo.toISOString().split('T')[0];
      break;
    default:
      startDate = endDate;
  }
  
  return { startDate, endDate };
};

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    // Try to restore from session storage
    const stored = sessionStorage.getItem('vizai_date_range');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return getDefaultDateRange();
      }
    }
    return getDefaultDateRange();
  });

  const setPreset = useCallback((preset: DateRangePreset) => {
    const dates = calculateDatesFromPreset(preset);
    const newRange: DateRange = {
      preset,
      ...dates,
    };
    setDateRange(newRange);
    sessionStorage.setItem('vizai_date_range', JSON.stringify(newRange));
  }, []);

  const setCustomRange = useCallback((startDate: string, endDate: string) => {
    const newRange: DateRange = {
      preset: 'custom',
      startDate,
      endDate,
    };
    setDateRange(newRange);
    sessionStorage.setItem('vizai_date_range', JSON.stringify(newRange));
  }, []);

  const formatDateRange = useCallback(() => {
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    
    if (dateRange.preset === 'today') {
      return `Today, ${start.toLocaleDateString('en-US', { ...options, year: 'numeric' })}`;
    }
    
    if (start.getFullYear() === end.getFullYear()) {
      return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', { ...options, year: 'numeric' })}`;
    }
    
    return `${start.toLocaleDateString('en-US', { ...options, year: 'numeric' })} - ${end.toLocaleDateString('en-US', { ...options, year: 'numeric' })}`;
  }, [dateRange]);

  const value = useMemo(() => ({
    dateRange,
    setPreset,
    setCustomRange,
    formatDateRange,
  }), [dateRange, setPreset, setCustomRange, formatDateRange]);

  return (
    <DateRangeContext.Provider value={value}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const context = useContext(DateRangeContext);
  if (context === undefined) {
    throw new Error('useDateRange must be used within a DateRangeProvider');
  }
  return context;
}

