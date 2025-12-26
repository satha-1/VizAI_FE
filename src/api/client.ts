/**
 * API Client for VizAI
 * Handles base URL, auth headers, and common fetch logic.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://jodi-consonantal-epidemically.ngrok-free.dev';

interface RequestOptions extends RequestInit {
    params?: Record<string, string>;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, headers, ...customConfig } = options;

    // Build URL with query parameters
    const url = new URL(`${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`);
    if (params) {
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }

    // Get token from localStorage
    const token = localStorage.getItem('auth_token');

    const defaultHeaders: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'ngrok-skip-browser-warning': 'true', // Bypass ngrok browser warning
    };

    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
        method: customConfig.method || (customConfig.body ? 'POST' : 'GET'),
        headers: {
            ...defaultHeaders,
            ...headers,
        },
        // REMOVED: credentials: 'include' to avoid CORS Access-Control-Allow-Credentials requirement
        ...customConfig,
    };

    try {
        const response = await fetch(url.toString(), config);

        if (response.status === 401) {
            console.error('Unauthorized request');
        }

        const contentType = response.headers.get('content-type');

        // Handle case where ngrok or server returns HTML instead of JSON
        if (contentType && contentType.includes('text/html')) {
            const htmlSnippet = await response.text();
            console.error('Ngrok warning or HTML page returned instead of JSON. Head header might be missing or backend issue.');
            console.error(`Status: ${response.status}`);
            console.error(`Body snippet (first 200 chars): ${htmlSnippet.substring(0, 200)}...`);
            throw new Error(`Expected JSON but received HTML. Status: ${response.status}`);
        }

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `API error: ${response.status}`;

            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorMessage;
            } catch {
                console.error(`Non-JSON Error Body (first 200 chars): ${errorText.substring(0, 200)}...`);
            }

            throw new Error(errorMessage);
        }

        // For download endpoints, return blob
        if (endpoint.includes('/download')) {
            return await response.blob() as unknown as T;
        }

        // For empty responses
        if (response.status === 204) {
            return response as unknown as T;
        }

        const jsonData = await response.json();
        console.log('📥 API Response received:', {
            endpoint,
            status: response.status,
            data: jsonData,
            dataType: typeof jsonData,
            isArray: Array.isArray(jsonData),
            keys: typeof jsonData === 'object' && jsonData !== null ? Object.keys(jsonData) : 'N/A'
        });
        return jsonData;
    } catch (error) {
        console.error('API Client Error:', error);
        throw error;
    }
}

