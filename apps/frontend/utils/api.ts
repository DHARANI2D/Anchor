import { API_BASE_URL } from '../config';

// Token expiry tracking
let tokenExpiryTime: number | null = null;
let refreshTimer: NodeJS.Timeout | null = null;

/**
 * Calculate token expiry time from JWT
 */
function getTokenExpiry(token: string): number | null {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp ? payload.exp * 1000 : null; // Convert to milliseconds
    } catch {
        return null;
    }
}

/**
 * Schedule proactive token refresh before expiry
 */
function scheduleTokenRefresh() {
    if (refreshTimer) {
        clearTimeout(refreshTimer);
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('anchor_token') : null;
    if (!token) return;

    const expiry = getTokenExpiry(token);
    if (!expiry) return;

    // Refresh 30 seconds before expiry (token is 5min, so refresh at 4:30)
    const refreshTime = expiry - Date.now() - 30000;

    if (refreshTime > 0) {
        refreshTimer = setTimeout(async () => {
            try {
                await refreshAccessToken();
            } catch (error) {
                console.error('Proactive token refresh failed:', error);
            }
        }, refreshTime);
    }
}

/**
 * Refresh access token using refresh token cookie
 */
async function refreshAccessToken(): Promise<string | null> {
    try {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include', // Send HttpOnly refresh token cookie
        });

        if (refreshRes.ok) {
            const data = await refreshRes.json();
            const newToken = data.access_token;

            if (typeof window !== 'undefined') {
                localStorage.setItem('anchor_token', newToken);
                scheduleTokenRefresh(); // Schedule next refresh
            }

            return newToken;
        } else {
            // Refresh failed, clear token
            if (typeof window !== 'undefined') {
                localStorage.removeItem('anchor_token');
                window.location.href = '/login';
            }
            return null;
        }
    } catch (error) {
        console.error('Token refresh failed:', error);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('anchor_token');
            window.location.href = '/login';
        }
        return null;
    }
}

/**
 * Enhanced authFetch with automatic token refresh and retry
 */
export async function authFetch(path: string, options: RequestInit = {}) {
    let token = typeof window !== 'undefined' ? localStorage.getItem('anchor_token') : null;

    const getHeaders = (t: string | null) => ({
        'Content-Type': 'application/json',
        ...(t ? { 'Authorization': `Bearer ${t}` } : {}),
        ...options.headers,
    });

    const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

    let response = await fetch(url, {
        ...options,
        credentials: 'include', // Always include cookies for refresh token
        headers: getHeaders(token),
    });

    // If unauthorized, try to refresh
    if (response.status === 401 && typeof window !== 'undefined' && path !== '/auth/refresh') {
        const newToken = await refreshAccessToken();

        if (newToken) {
            // Retry the original request with the new token
            response = await fetch(url, {
                ...options,
                credentials: 'include',
                headers: getHeaders(newToken),
            });
        }
    }

    return response;
}

/**
 * Initialize token refresh scheduling on app load
 */
export function initTokenRefresh() {
    if (typeof window !== 'undefined') {
        scheduleTokenRefresh();

        // Re-schedule on storage changes (e.g., login in another tab)
        window.addEventListener('storage', (e) => {
            if (e.key === 'anchor_token') {
                scheduleTokenRefresh();
            }
        });
    }
}

/**
 * Clear token refresh timer on logout
 */
export function clearTokenRefresh() {
    if (refreshTimer) {
        clearTimeout(refreshTimer);
        refreshTimer = null;
    }
}
