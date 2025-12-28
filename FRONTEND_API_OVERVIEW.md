# Frontend API Integration Overview

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [API Client Layer](#api-client-layer)
3. [Endpoints Layer](#endpoints-layer)
4. [Data Transformation Layer](#data-transformation-layer)
5. [React Query Hooks Layer](#react-query-hooks-layer)
6. [Authentication](#authentication)
7. [Error Handling](#error-handling)
8. [API Endpoints Reference](#api-endpoints-reference)
9. [Data Flow](#data-flow)
10. [Common Patterns](#common-patterns)

---

## Architecture Overview

The frontend API integration follows a **4-layer architecture**:

```
┌─────────────────────────────────────────────────────────┐
│  React Components (Pages, Components)                   │
│  - Uses React Query hooks                               │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  React Query Hooks Layer (hooks.ts)                    │
│  - useBehaviorEvents, useBehaviorSummary, etc.          │
│  - Query caching, invalidation, mutations               │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  Data Transformation Layer (api.ts)                     │
│  - fetchBehaviorEvents, fetchBehaviorSummary, etc.      │
│  - Backend ↔ Frontend data mapping                      │
│  - S3 URL conversion, behavior type normalization       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  Endpoints Layer (endpoints.ts)                         │
│  - getAnteaterTimelineApi, getAnimalProfileApi, etc.    │
│  - Direct API endpoint definitions                      │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  API Client Layer (client.ts)                           │
│  - apiClient() - Centralized fetch wrapper              │
│  - Auth headers, base URL, error handling               │
└─────────────────────────────────────────────────────────┘
```

---

## API Client Layer

**File:** `src/api/client.ts`

### Purpose
Centralized HTTP client that handles:
- Base URL configuration
- Authentication headers
- Request/response transformation
- Error handling
- CORS and ngrok-specific headers

### Key Features

#### 1. Base URL Configuration
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  'https://jodi-consonantal-epidemically.ngrok-free.app';
```

#### 2. Authentication
- Reads `auth_token` from `localStorage`
- Automatically adds `Authorization: Bearer <token>` header
- Falls back gracefully if no token exists

#### 3. Request Headers
```typescript
const defaultHeaders: HeadersInit = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'ngrok-skip-browser-warning': 'true', // Bypass ngrok browser warning
};
```

#### 4. Query Parameters
- Supports `params` object in options
- Automatically appends to URL as query string

#### 5. Error Handling
- Detects HTML responses (ngrok warnings)
- Parses JSON error responses
- Handles 401 Unauthorized
- Handles 204 No Content
- Handles blob responses for downloads

#### 6. Response Types
- **JSON**: Default parsing
- **Blob**: For download endpoints (`/download`)
- **Empty**: For 204 responses

### Usage Example
```typescript
const data = await apiClient<MyType>('/api/v1/endpoint', {
  method: 'POST',
  body: JSON.stringify(payload),
  params: { key: 'value' }
});
```

---

## Endpoints Layer

**File:** `src/api/endpoints.ts`

### Purpose
Defines direct API endpoint functions. Each function:
- Maps to a specific backend endpoint
- Uses `apiClient` for HTTP requests
- Provides TypeScript types for request/response

### Endpoint Categories

#### 1. Animal Management
- `getAllAnimalsApi()` - `GET /api/v1/animals`
- `getAnimalProfileApi(animalName, animalId)` - `GET /api/v1/animal/:animal_name/:animal_id/profile`
- `createAnimalProfileApi(data)` - `POST /api/v1/animal/profile`
- `updateAnimalProfileApi(animalName, animalId, data)` - `PUT /api/v1/animal/:animal_name/:animal_id/profile`
- `deleteAnimalProfileApi(animalId)` - `DELETE /api/v1/animal/:animal_id/profile`

#### 2. Behavior Data
- `getAnteaterTimelineApi(animalId, startDate, endDate)` - `GET /api/v1/anteater/:animal_id/timeline`
- `getBehaviorsSummaryApi(animalId, startDate, endDate)` - `GET /api/v1/anteater/behaviors/summary`
- `getAnteaterBehaviorsApi(startDate, endDate)` - `GET /api/v1/anteater/behaviors`

#### 3. Reports
- `generateReportApi(data)` - `POST /api/v1/reports/generate`

#### 4. Utilities
- `getDateRangeApi()` - `GET /api/date-range` (deprecated, uses timeline API)

### Example
```typescript
export const getAnimalProfileApi = (animalName: string, animalId: string) =>
  apiClient<Animal>(`/api/v1/animal/${animalName}/${animalId}/profile`);
```

---

## Data Transformation Layer

**File:** `src/api/api.ts`

### Purpose
- Transforms backend data formats to frontend models
- Handles ID mapping (frontend ↔ backend)
- Normalizes behavior types
- Converts S3 URLs to HTTP URLs
- Calculates derived data (summaries, heatmaps)

### Key Transformations

#### 1. Animal ID Mapping
```typescript
const ANIMAL_ID_MAP: Record<string, string> = {
  'giant-anteater': 'GAE-01',
};

const ANIMAL_NAME_MAP: Record<string, string> = {
  'giant-anteater': 'anteater',
};
```

**Functions:**
- `getBackendAnimalId(frontendId)` - Maps frontend ID to backend ID
- `getBackendAnimalName(frontendId)` - Maps frontend ID to backend name

#### 2. Behavior Type Normalization

**Backend → Frontend Mapping:**
```typescript
const BACKEND_TO_FRONTEND_BEHAVIOR_MAP: Record<string, BehaviorType> = {
  'PACING': 'Pacing',
  'PACING_START': 'Pacing Start',
  'PACING_STOPPED': 'Pacing Stopped',
  'RECUMBENT': 'Recumbent',
  // ... more mappings
};
```

**Functions:**
- `getFrontendBehaviorType(backendType)` - Converts backend behavior strings to frontend format
- `getBackendBehaviorType(frontendType)` - Converts frontend behavior types to backend format
- `titleCaseBehavior(backendType)` - Dynamic title-casing for unknown behaviors

#### 3. Behavior Event Transformation

**Function:** `transformBehaviorEvent(event)`

**Handles:**
- Multiple field name formats (PascalCase, snake_case, camelCase)
- Timestamp format conversion (ISO, "YYYY-MM-DD HH:mm:ss", RFC 2822)
- Duration parsing ("HH:MM:SS" string → seconds)
- S3 URL conversion to HTTP
- Confidence score normalization (percentage → decimal)
- Environmental context extraction

**Output:**
```typescript
interface BehaviorEvent {
  id: string;
  behavior_type: BehaviorType;
  raw_behavior_type?: string;  // Original backend value
  start_timestamp: string;       // ISO format
  end_timestamp: string;         // ISO format
  duration_seconds: number;
  camera_source: string;
  raw_video_url?: string;        // Original S3 URL
  video_url: string;             // Converted HTTP URL
  thumbnail_url: string;
  confidence_score: number;      // 0-1 decimal
  environmental_context?: {...};
}
```

#### 4. S3 URL Conversion

**Functions:**
- `isS3Url(url)` - Detects S3 URLs (`s3://bucket/key`)
- `convertS3UrlToHttp(url)` - Converts to `https://bucket.s3.amazonaws.com/key`

**Example:**
```typescript
s3://my-bucket/videos/clip.mp4 
  → https://my-bucket.s3.amazonaws.com/videos/clip.mp4
```

#### 5. Summary Generation

**Function:** `generateSummaryFromEvents(events, startDate, endDate)`

**Calculates:**
- Total behavior count
- Most frequent behavior
- Total monitored seconds
- Per-behavior statistics:
  - Count
  - Total duration
  - Average duration
  - Min/Max duration
  - Percentage of total
- Hourly heatmap (24 hours × behaviors)

**Function:** `generateHeatmapFromEvents(events)`

**Generates:**
- Hourly activity heatmap
- Count and duration per behavior per hour
- Uses `getZooHour()` for timezone-aware hour extraction

#### 6. Date Range Extraction

**Function:** `fetchDateRange()`

**Strategy:**
1. Fetches timeline API with wide date range
2. Extracts min/max dates from `start_datetime`/`end_datetime` in events
3. Falls back to `start_date`/`end_date` in response
4. Final fallback to default range (`2025-10-01` to `2025-10-30`)

### Main API Functions

#### `fetchBehaviorEvents(startDate, endDate, behaviorType?, frontendAnimalId?)`
- Fetches from timeline API
- Handles multiple response formats (array, `{timeline: []}`, `{behaviours: []}`, etc.)
- Transforms all events
- Filters by behavior type if specified

#### `fetchBehaviorSummary(preset, startDate?, endDate?, frontendAnimalId?)`
- Fetches events from timeline API
- Generates summary from events (no separate summary API)
- Returns `DashboardSummary` with behaviors, heatmap, totals

#### `fetchAnimal(animalId)`
- Maps frontend ID to backend ID/name
- Fetches profile
- Transforms to frontend `Animal` model

#### `fetchAnimalProfileByBackend(animalName, animalId)`
- Direct backend ID/name lookup
- Used for animal cards with explicit backend identifiers

#### `createAnimalProfile(frontendAnimalId, data)`
- Maps frontend ID to backend
- Creates profile via POST API

#### `updateAnimalProfile(frontendAnimalId, data)`
- Maps frontend ID to backend
- Updates profile via PUT API

#### `deleteAnimalProfile(frontendAnimalId)`
- Maps frontend ID to backend
- Soft-deletes profile (sets status="DELETED") via DELETE API

#### `generateReport(config, format, animalId?)`
- Maps frontend animal ID to backend
- Maps frontend behavior type to backend
- Generates report via POST API
- Returns `GeneratedReport` with `download_url`

#### `fetchAllAnimals()`
- Fetches all animals from `GET /api/v1/animals`
- Returns array of animal objects

---

## React Query Hooks Layer

**File:** `src/api/hooks.ts`

### Purpose
Provides React Query hooks for:
- Data fetching with caching
- Mutations with cache invalidation
- Loading/error states
- Automatic refetching

### Query Keys

**Versioning:**
```typescript
const QUERY_VERSION = 'v1'; // Bump to invalidate all caches
```

**Key Structure:**
```typescript
export const queryKeys = {
  behaviorEvents: (startDate, endDate, behaviorType?, animalId?) => 
    ['behaviorEvents', QUERY_VERSION, startDate, endDate, behaviorType, animalId],
  behaviorSummary: (preset, startDate?, endDate?, animalId?) => 
    ['behaviorSummary', QUERY_VERSION, preset, startDate, endDate, animalId],
  allAnimals: () => ['allAnimals', QUERY_VERSION],
  animal: (animalId) => ['animal', animalId],
  animalProfile: (animalName, animalId) => ['animalProfile', animalName, animalId],
};
```

### Query Hooks

#### `useBehaviorEvents(startDate, endDate, behaviorType?, enabled?, animalId?)`
- Fetches behavior events for date range
- Can filter by behavior type
- Can be disabled with `enabled=false`
- Automatically caches and refetches

#### `useBehaviorSummary(preset, startDate?, endDate?, enabled?, animalId?)`
- Fetches behavior summary
- Calculates from timeline events
- Used for dashboard charts

#### `useAllAnimals()`
- Fetches all animals
- Used for animal selection dropdown and cards

#### `useAnimal(animalId)`
- Fetches single animal profile
- Maps frontend ID to backend

#### `useAnimalProfileByBackend(animalName, animalId, enabled?)`
- Fetches profile by explicit backend identifiers
- Used for animal cards

### Mutation Hooks

#### `useCreateAnimalProfile(animalId)`
- Creates new animal profile
- **Cache Invalidation:**
  - `animal` queries
  - `allAnimals` queries
  - `animalProfile` queries

#### `useUpdateAnimalProfile(animalId)`
- Updates existing animal profile
- **Cache Invalidation:** Same as create

#### `useDeleteAnimalProfile(animalId)`
- Soft-deletes animal profile (sets status="DELETED")
- **Cache Invalidation:** Same as create

#### `useGenerateReport(animalId?)`
- Generates behavior report
- Returns `GeneratedReport` with `download_url`
- No cache invalidation (reports are one-time)

#### `useSendChatQuery()`
- Sends chat query (currently mock)
- Returns AI response

### Usage Example
```typescript
// Query
const { data, isLoading, error } = useBehaviorEvents(
  '2025-10-01',
  '2025-10-30',
  undefined,
  true,
  'giant-anteater'
);

// Mutation
const createProfile = useCreateAnimalProfile('giant-anteater');
createProfile.mutate({
  animal_id: 'GAE-01',
  animal_name: 'anteater',
  date_of_birth: '2020-01-01',
});
```

---

## Authentication

### Token Storage
- **Location:** `localStorage.getItem('auth_token')`
- **Header:** `Authorization: Bearer <token>`
- **Automatic:** All API requests include token if present

### Auth Context
**File:** `src/context/AuthContext.tsx`

- Manages user session in `sessionStorage`
- Provides `useAuth()` hook
- Currently uses mock login (no real API)

### Future Integration
When real auth API is available:
1. Login endpoint: `POST /api/v1/auth/login`
2. Store token: `localStorage.setItem('auth_token', token)`
3. Logout: `localStorage.removeItem('auth_token')`

---

## Error Handling

### API Client Level
1. **HTML Responses:** Detects ngrok warnings, logs error
2. **Non-JSON Errors:** Attempts JSON parse, falls back to status text
3. **401 Unauthorized:** Logs error (could redirect to login)
4. **Network Errors:** Caught and re-thrown

### React Query Level
- **Error State:** `error` object in query result
- **Retry Logic:** Default React Query retry (3 attempts)
- **Error Boundaries:** Can be caught by React error boundaries

### Component Level
- **Error States:** Components show error messages
- **Empty States:** Show "No data" when arrays are empty
- **Toast Notifications:** Use `useToast()` for user feedback

### Example Error Handling
```typescript
const { data, isLoading, error } = useBehaviorEvents(...);

if (error) {
  return <ErrorState message={error.message} />;
}

if (!data || data.length === 0) {
  return <EmptyState message="No behavior events found" />;
}
```

---

## API Endpoints Reference

### Animal Management

#### `GET /api/v1/animals`
**Purpose:** Get all animals  
**Hook:** `useAllAnimals()`  
**Response:** `Animal[]`  
**Usage:** Animal selection dropdown, animal cards

#### `GET /api/v1/animal/:animal_name/:animal_id/profile`
**Purpose:** Get animal profile  
**Hook:** `useAnimal(animalId)` or `useAnimalProfileByBackend(animalName, animalId)`  
**Response:** `Animal`  
**Usage:** Profile page, animal cards

#### `POST /api/v1/animal/profile`
**Purpose:** Create animal profile  
**Hook:** `useCreateAnimalProfile(animalId)`  
**Request Body:**
```json
{
  "animal_id": "GAE-01",
  "animal_name": "anteater",
  "date_of_birth": "2020-01-01",
  "gender": "Female",
  "environment_id": "ENV-01",
  "description": "Description"
}
```
**Usage:** "Add Animal Profile" modal

#### `PUT /api/v1/animal/:animal_name/:animal_id/profile`
**Purpose:** Update animal profile  
**Hook:** `useUpdateAnimalProfile(animalId)`  
**Request Body:**
```json
{
  "date_of_birth": "2020-01-01",
  "gender": "Female",
  "environment_id": "ENV-01",
  "animal_description": "Description",
  "environment_description": "Env Description"
}
```
**Usage:** Profile page edit mode

#### `DELETE /api/v1/animal/:animal_id/profile`
**Purpose:** Soft-delete animal profile (sets status="DELETED")  
**Hook:** `useDeleteAnimalProfile(animalId)`  
**Response:** Success/error  
**Usage:** Delete icon on animal cards

### Behavior Data

#### `GET /api/v1/anteater/:animal_id/timeline?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
**Purpose:** Get behavior timeline events  
**Hook:** `useBehaviorEvents(startDate, endDate, behaviorType?, enabled?, animalId?)`  
**Response:** `BehaviorEvent[]` (or `{timeline: BehaviorEvent[]}`)  
**Usage:** Timeline page, dashboard summary calculation

**Response Formats Handled:**
- Direct array: `BehaviorEvent[]`
- Wrapped: `{timeline: BehaviorEvent[]}`
- Wrapped: `{behaviours: BehaviorEvent[]}`
- Wrapped: `{behaviors: BehaviorEvent[]}`
- Error: `{error: "No data found"}` → Returns empty array

#### `GET /api/v1/anteater/behaviors/summary?animal_id=GAE-01&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
**Purpose:** Get behavior summary (currently unused - calculated from timeline)  
**Hook:** `useBehaviorSummary(preset, startDate?, endDate?, enabled?, animalId?)`  
**Response:** `DashboardSummary`  
**Usage:** Dashboard charts (but actually calculated from timeline events)

### Reports

#### `POST /api/v1/reports/generate`
**Purpose:** Generate behavior report  
**Hook:** `useGenerateReport(animalId?)`  
**Request Body:**
```json
{
  "animal_ids": ["GAE-01"],
  "startDate": "2025-10-01",
  "endDate": "2025-10-30",
  "behaviour": "PACING"
}
```
**Response:**
```json
{
  "report_id": "report-123",
  "download_url": "https://...",
  "count": 42,
  "status": "success"
}
```
**Usage:** Reports page

**Download:**
- **CSV:** `window.open(download_url + '?format=csv')`
- **PDF:** Client-side browser print dialog (Save as PDF) - workaround for backend PDF issues

---

## Data Flow

### 1. Component → Hook → API → Backend

```
Component (Dashboard.tsx)
  ↓
useBehaviorSummary(preset, startDate, endDate, true, animalId)
  ↓
fetchBehaviorSummary(preset, startDate, endDate, frontendAnimalId)
  ↓
fetchBehaviorEvents(startDate, endDate, undefined, frontendAnimalId)
  ↓
getAnteaterTimelineApi(backendAnimalId, startDate, endDate)
  ↓
apiClient('/api/v1/anteater/GAE-01/timeline', {params: {...}})
  ↓
fetch() → Backend API
```

### 2. Data Transformation Flow

```
Backend Response (Raw)
  ↓
transformBehaviorEvent(event)
  - Normalize field names
  - Convert timestamps
  - Parse duration
  - Convert S3 URLs
  - Normalize behavior types
  ↓
BehaviorEvent (Frontend Model)
  ↓
generateSummaryFromEvents(events)
  - Calculate counts
  - Calculate durations
  - Generate heatmap
  ↓
DashboardSummary
  ↓
Component (Charts, Tables)
```

### 3. Cache Invalidation Flow

```
User Action (Create Profile)
  ↓
useCreateAnimalProfile(animalId).mutate(data)
  ↓
createAnimalProfile(frontendAnimalId, data)
  ↓
POST /api/v1/animal/profile
  ↓
onSuccess: queryClient.invalidateQueries(...)
  - Invalidate 'animal' queries
  - Invalidate 'allAnimals' queries
  - Invalidate 'animalProfile' queries
  ↓
React Query Refetches
  ↓
UI Updates Automatically
```

---

## Common Patterns

### 1. Dynamic Animal ID Handling

**Pattern:** Frontend uses URL-friendly IDs (`giant-anteater`), backend uses database IDs (`GAE-01`)

**Solution:**
```typescript
const { animalId } = useParams(); // From route: /animals/:animalId/dashboard
const backendAnimalId = getBackendAnimalId(animalId || 'giant-anteater');
```

### 2. Date Range Handling

**Pattern:** Date ranges come from timeline API, stored in context

**Solution:**
```typescript
const { dateRange } = useDateRange();
const { data } = useBehaviorEvents(
  dateRange.startDate,
  dateRange.endDate,
  undefined,
  true,
  animalId
);
```

### 3. S3 URL Conversion

**Pattern:** Backend returns `s3://` URLs, frontend needs HTTP URLs

**Solution:**
```typescript
const videoUrl = isS3Url(rawUrl) 
  ? convertS3UrlToHttp(rawUrl) 
  : rawUrl;
```

### 4. Behavior Type Normalization

**Pattern:** Backend uses `PACING_START`, frontend displays "Pacing Start"

**Solution:**
```typescript
const frontendType = getFrontendBehaviorType(backendType);
// 'PACING_START' → 'Pacing Start'
```

### 5. Empty State Handling

**Pattern:** API returns empty array or error object

**Solution:**
```typescript
if (response.error === "No data found") {
  return []; // Not a real error, just no data
}
if (!data || data.length === 0) {
  return <EmptyState />;
}
```

### 6. Cache Invalidation on Mutations

**Pattern:** After creating/updating/deleting, refresh related queries

**Solution:**
```typescript
onSuccess: async () => {
  await queryClient.invalidateQueries({ queryKey: queryKeys.allAnimals() });
  await queryClient.invalidateQueries({ queryKey: queryKeys.animal(animalId) });
}
```

### 7. Conditional Query Execution

**Pattern:** Only fetch when required data is available

**Solution:**
```typescript
const { data } = useAnimalProfileByBackend(
  animalName,
  animalId,
  enabled: !!animalName && !!animalId
);
```

### 8. Report Download Pattern

**Pattern:** Backend returns `download_url`, frontend triggers download

**Solution:**
```typescript
// CSV
window.open(download_url + '?format=csv', '_blank');

// PDF (workaround)
window.print(); // User saves as PDF
```

---

## Environment Configuration

### Base URL
```env
VITE_API_BASE_URL=https://your-api-url.com
```

**Default:** `https://jodi-consonantal-epidemically.ngrok-free.app`

### ngrok Headers
- `ngrok-skip-browser-warning: true` - Bypasses ngrok browser warning page

---

## TypeScript Types

### Core Types (from `src/types/index.ts`)

```typescript
interface BehaviorEvent {
  id: string;
  behavior_type: BehaviorType;
  raw_behavior_type?: string;
  start_timestamp: string;
  end_timestamp: string;
  duration_seconds: number;
  camera_source: string;
  raw_video_url?: string;
  video_url: string;
  thumbnail_url: string;
  confidence_score: number;
  environmental_context?: {...};
}

interface Animal {
  id: string;
  species: string;
  name: string;
  age: number;
  sex: 'Male' | 'Female';
  enclosure: string;
  status: 'Active' | 'Alert' | 'COMING_SOON' | 'DELETED';
  // ... more fields
}

interface DashboardSummary {
  total_behaviors: number;
  most_frequent_behavior: BehaviorType;
  total_monitored_seconds: number;
  behaviors: BehaviorSummary[];
  hourly_heatmap: HourlyHeatmapData[];
}

interface GeneratedReport {
  report_id: string;
  download_url: string;
  count: number;
  status: string;
}
```

---

## Testing Considerations

### Mock Data
- No mock data layer (removed `mockData.ts`)
- All data comes from real APIs

### Error Scenarios
- Network failures
- 401 Unauthorized
- Empty responses
- Invalid date formats
- Missing fields

### Cache Testing
- Query version bumps
- Cache invalidation
- Stale data handling

---

## Future Improvements

1. **Real Authentication API**
   - Replace mock login
   - Token refresh logic
   - Logout API call

2. **Error Recovery**
   - Retry logic for network errors
   - Offline support
   - Error boundaries

3. **Performance**
   - Pagination for large datasets
   - Virtual scrolling for timelines
   - Image lazy loading

4. **Type Safety**
   - Stricter backend response types
   - Runtime validation (Zod)
   - API contract testing

---

## Summary

The frontend API integration is **well-structured** with clear separation of concerns:

- **Client Layer:** Handles HTTP, auth, errors
- **Endpoints Layer:** Defines API contracts
- **Transformation Layer:** Maps backend ↔ frontend
- **Hooks Layer:** Provides React Query integration

This architecture makes it easy to:
- Add new endpoints
- Modify data transformations
- Handle errors consistently
- Cache and invalidate data
- Test API interactions

All API calls flow through this consistent pattern, ensuring maintainability and reliability.

