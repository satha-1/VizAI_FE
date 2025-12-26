import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchBehaviorEvents, 
  fetchBehaviorSummary, 
  fetchAllAnimals,
  fetchAnimal, 
  fetchAnimalProfileByBackend,
  generateReport,
  createAnimalProfile,
  updateAnimalProfile,
  deleteAnimalProfile,
  sendChatQuery 
} from './api';
import { BehaviorType, ReportConfig, ExportFormat } from '../types';

// Query Keys
// Bump this when backend mapping/transforms change to force React Query to refetch
const QUERY_VERSION = 'v1';
export const queryKeys = {
  behaviorEvents: (startDate: string, endDate: string, behaviorType?: BehaviorType, animalId?: string) => 
    ['behaviorEvents', QUERY_VERSION, startDate, endDate, behaviorType, animalId] as const,
  behaviorSummary: (preset: string, startDate?: string, endDate?: string, animalId?: string) => 
    ['behaviorSummary', QUERY_VERSION, preset, startDate, endDate, animalId] as const,
  allAnimals: () => ['allAnimals', QUERY_VERSION] as const,
  animal: (animalId: string) => ['animal', animalId] as const,
  animalProfile: (animalName: string, animalId: string) => ['animalProfile', animalName, animalId] as const,
};

// Hooks

export const useBehaviorEvents = (
  startDate: string,
  endDate: string,
  behaviorType?: BehaviorType,
  enabled: boolean = true,
  animalId?: string
) => {
  return useQuery({
    queryKey: queryKeys.behaviorEvents(startDate, endDate, behaviorType, animalId),
    queryFn: () => fetchBehaviorEvents(startDate, endDate, behaviorType, animalId),
    enabled,
  });
};

export const useBehaviorSummary = (
  preset: string,
  startDate?: string,
  endDate?: string,
  enabled: boolean = true,
  animalId?: string
) => {
  return useQuery({
    queryKey: queryKeys.behaviorSummary(preset, startDate, endDate, animalId),
    queryFn: () => fetchBehaviorSummary(preset, startDate, endDate, animalId),
    enabled,
  });
};

export const useAllAnimals = () => {
  return useQuery({
    queryKey: queryKeys.allAnimals(),
    queryFn: () => fetchAllAnimals(),
  });
};

export const useAnimal = (animalId: string) => {
  return useQuery({
    queryKey: queryKeys.animal(animalId),
    queryFn: () => fetchAnimal(animalId),
  });
};

export const useAnimalProfileByBackend = (animalName: string, animalId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.animalProfile(animalName, animalId),
    queryFn: () => fetchAnimalProfileByBackend(animalName, animalId),
    enabled: enabled && !!animalName && !!animalId,
  });
};

export const useCreateAnimalProfile = (animalId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      animal_id?: string;
      animal_name?: string;
      date_of_birth?: string;
      gender?: string;
      environment_id?: string;
      description?: string;
    }) => createAnimalProfile(animalId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.animal(animalId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.allAnimals() });
      await queryClient.invalidateQueries({ queryKey: ['animalProfile'] });
    },
  });
};

export const useUpdateAnimalProfile = (animalId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      date_of_birth?: string;
      gender?: string;
      environment_id?: string;
      animal_description?: string;
      environment_description?: string;
    }) => updateAnimalProfile(animalId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.animal(animalId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.allAnimals() });
      await queryClient.invalidateQueries({ queryKey: ['animalProfile'] });
    },
  });
};

export const useDeleteAnimalProfile = (animalId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteAnimalProfile(animalId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.animal(animalId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.allAnimals() });
      await queryClient.invalidateQueries({ queryKey: ['animalProfile'] });
    },
  });
};

export const useGenerateReport = (animalId?: string) => {
  return useMutation({
    mutationFn: ({ config, format }: { config: ReportConfig; format: ExportFormat }) =>
      generateReport(config, format, animalId),
  });
};

export const useSendChatQuery = () => {
  return useMutation({
    mutationFn: ({ query, conversationId }: { query: string; conversationId?: string }) =>
      sendChatQuery(query, conversationId),
  });
};

