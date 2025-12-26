import { createContext, useContext, useState, useCallback, ReactNode, useMemo, useEffect } from 'react';
import { DateRange, DateRangePreset } from '../types';
import { fetchDateRange } from '../api/api';

interface DateRangeContextType {
  dateRange: DateRange;
  setPreset: (preset: DateRangePreset) => void;
  setCustomRange: (startDate: string, endDate: string) => void;
  formatDateRange: () => string;
  updateDateRangeFromApi: (startDate: string, endDate: string) => void;
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

// Version for cache invalidation - increment to clear old cached dates
const STORAGE_VERSION = 'v3';
const STORAGE_KEY = `vizai_date_range_${STORAGE_VERSION}`;

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    // Clear all old storage keys to force fresh fetch
    sessionStorage.removeItem('vizai_date_range'); // Old key without version
    sessionStorage.removeItem('vizai_date_range_v1'); // Old version
    sessionStorage.removeItem('vizai_date_range_v2'); // Old version
    
    // Don't restore from session - always start fresh and fetch from API
    // The useEffect below will fetch the correct dates from the timeline API
    return getDefaultDateRange();
  });
  
  const [, setIsInitialized] = useState(false);

  // Fetch date range from timeline API on mount - ALWAYS get fresh data
  useEffect(() => {
    const initializeDateRange = async () => {
      try {
        // Always fetch fresh date range from timeline API
        console.log('🔄 Fetching fresh date range from timeline API...');
        const apiDateRange = await fetchDateRange();
        console.log('📅 Fetched date range from timeline API:', apiDateRange);
        
        if (apiDateRange.startDate && apiDateRange.endDate) {
          const newRange: DateRange = {
            preset: 'custom',
            startDate: apiDateRange.startDate,
            endDate: apiDateRange.endDate,
          };
          setDateRange(newRange);
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newRange));
          console.log('✅ Date range set from timeline API:', newRange);
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch date range from API, using default:', error);
      } finally {
        setIsInitialized(true);
      }
    };
    
    initializeDateRange();
  }, []);

  const setPreset = useCallback((preset: DateRangePreset) => {
    const dates = calculateDatesFromPreset(preset);
    const newRange: DateRange = {
      preset,
      ...dates,
    };
    setDateRange(newRange);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newRange));
  }, []);

  const setCustomRange = useCallback((startDate: string, endDate: string) => {
    const newRange: DateRange = {
      preset: 'custom',
      startDate,
      endDate,
    };
    setDateRange(newRange);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newRange));
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

  const updateDateRangeFromApi = useCallback((startDate: string, endDate: string) => {
    // Only update if dates are different from current range
    if (dateRange.startDate !== startDate || dateRange.endDate !== endDate) {
      const newRange: DateRange = {
        preset: 'custom',
        startDate,
        endDate,
      };
      setDateRange(newRange);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newRange));
      console.log('📅 Date range updated from timeline API:', newRange);
    }
  }, [dateRange.startDate, dateRange.endDate]);

  const value = useMemo(() => ({
    dateRange,
    setPreset,
    setCustomRange,
    formatDateRange,
    updateDateRangeFromApi,
  }), [dateRange, setPreset, setCustomRange, formatDateRange, updateDateRangeFromApi]);

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

