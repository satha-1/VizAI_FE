import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  fetchBehaviorEvents, 
  fetchBehaviorSummary, 
  fetchAnimal, 
  generateReport,
  sendChatQuery 
} from './api';
import { BehaviorType, ReportConfig, ExportFormat } from '../types';

// Query Keys
export const queryKeys = {
  behaviorEvents: (startDate: string, endDate: string, behaviorType?: BehaviorType) => 
    ['behaviorEvents', startDate, endDate, behaviorType] as const,
  behaviorSummary: (preset: string, startDate?: string, endDate?: string) => 
    ['behaviorSummary', preset, startDate, endDate] as const,
  animal: (animalId: string) => ['animal', animalId] as const,
};

// Hooks

export const useBehaviorEvents = (
  startDate: string,
  endDate: string,
  behaviorType?: BehaviorType,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: queryKeys.behaviorEvents(startDate, endDate, behaviorType),
    queryFn: () => fetchBehaviorEvents(startDate, endDate, behaviorType),
    enabled,
  });
};

export const useBehaviorSummary = (
  preset: string,
  startDate?: string,
  endDate?: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: queryKeys.behaviorSummary(preset, startDate, endDate),
    queryFn: () => fetchBehaviorSummary(preset, startDate, endDate),
    enabled,
  });
};

export const useAnimal = (animalId: string) => {
  return useQuery({
    queryKey: queryKeys.animal(animalId),
    queryFn: () => fetchAnimal(animalId),
  });
};

export const useGenerateReport = () => {
  return useMutation({
    mutationFn: ({ config, format }: { config: ReportConfig; format: ExportFormat }) =>
      generateReport(config, format),
  });
};

export const useSendChatQuery = () => {
  return useMutation({
    mutationFn: ({ query, conversationId }: { query: string; conversationId?: string }) =>
      sendChatQuery(query, conversationId),
  });
};

