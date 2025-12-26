import { apiClient } from './client';
import {
    Animal,
    BehaviorEvent,
    DashboardSummary,
    ReportConfig,
    GeneratedReport
} from '../types';

/**
 * Get All Animals
 * GET /api/v1/animals
 */
export const getAllAnimalsApi = () =>
    apiClient<any[]>(`/api/v1/animals`);

/**
 * Animal Profile
 * GET /api/v1/animal/:animal_name/:animal_id/profile
 */
export const getAnimalProfileApi = (animalName: string, animalId: string) =>
    apiClient<Animal>(`/api/v1/animal/${animalName}/${animalId}/profile`);

/**
 * Animal Profile - Create
 * POST /api/v1/animal/profile
 */
export const createAnimalProfileApi = (data: {
    animal_id: string;
    animal_name: string;
    date_of_birth?: string;
    gender?: string;
    environment_id?: string;
    description?: string;
}) =>
    apiClient<any>(`/api/v1/animal/profile`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

/**
 * Animal Profile - Update
 * PUT /api/v1/animal/:animal_name/:animal_id/profile
 */
export const updateAnimalProfileApi = (
    animalName: string,
    animalId: string,
    data: {
        date_of_birth?: string;
        gender?: string;
        environment_id?: string;
        animal_description?: string;
        environment_description?: string;
    }
) =>
    apiClient<any>(`/api/v1/animal/${animalName}/${animalId}/profile`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });

/**
 * Animal Profile - Delete
 * DELETE /api/v1/animal/:animal_id/profile
 *
 * Backend performs a soft-delete by setting status="DELETED".
 */
export const deleteAnimalProfileApi = (animalId: string) =>
    apiClient<any>(`/api/v1/animal/${animalId}/profile`, {
        method: 'DELETE',
    });

/**
 * Anteater Behaviors
 * GET /api/v1/anteater/behaviors?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Note: Postman uses camelCase for this specific endpoint
 */
export const getAnteaterBehaviorsApi = (startDate: string, endDate: string) =>
    apiClient<BehaviorEvent[]>(`/api/v1/anteater/behaviors`, {
        params: { startDate, endDate }
    });

/**
 * Date Range
 * GET /api/date-range
 */
export const getDateRangeApi = () =>
    apiClient<{ startDate: string; endDate: string }>('/api/date-range');

/**
 * Timeline
 * GET /api/v1/anteater/:animal_id/timeline?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
 */
export const getAnteaterTimelineApi = (animalId: string, startDate: string, endDate: string) =>
    apiClient<BehaviorEvent[]>(`/api/v1/anteater/${animalId}/timeline`, {
        params: { start_date: startDate, end_date: endDate }
    });

/**
 * Behavior Summary
 * GET /api/v1/anteater/behaviors/summary?animal_id=GAE-01&start_date=2025-10-01&end_date=2025-10-30
 */
export const getBehaviorsSummaryApi = (animalId: string, startDate: string, endDate: string) =>
    apiClient<DashboardSummary>('/api/v1/anteater/behaviors/summary', {
        params: { animal_id: animalId, start_date: startDate, end_date: endDate }
    });

/**
 * Behavior Video Collection
 * GET /api/v1/anteater/behaviors/:animal_id/video?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
 */
export const getBehaviorsVideoApi = (animalId: string, startDate: string, endDate: string) =>
    apiClient<any>(`/api/v1/anteater/behaviors/${animalId}/video`, {
        params: { start_date: startDate, end_date: endDate }
    });

/**
 * Generate Report
 * POST /api/v1/reports/generate
 */
export const generateReportApi = (data: Partial<ReportConfig> & { animal_ids: string[], startDate: string, endDate: string }) =>
    apiClient<GeneratedReport>('/api/v1/reports/generate', {
        method: 'POST',
        body: JSON.stringify(data)
    });

