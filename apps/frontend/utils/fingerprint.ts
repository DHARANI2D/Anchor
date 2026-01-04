/**
 * Device Fingerprinting Utility
 * Generates browser fingerprint for enhanced security
 */

export interface DeviceFingerprint {
    userAgent: string;
    language: string;
    screenResolution: string;
    timezone: string;
    platform: string;
}

/**
 * Collect device fingerprint data
 */
export function collectFingerprint(): DeviceFingerprint {
    if (typeof window === 'undefined') {
        return {
            userAgent: '',
            language: '',
            screenResolution: '',
            timezone: '',
            platform: ''
        };
    }

    return {
        userAgent: navigator.userAgent,
        language: navigator.language,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        platform: navigator.platform
    };
}

/**
 * Generate fingerprint hash (simple client-side hash)
 * Note: Server does the actual fingerprinting for security
 */
export function getFingerprintHash(): string {
    const fp = collectFingerprint();
    const fpString = `${fp.userAgent}|${fp.language}|${fp.screenResolution}|${fp.timezone}|${fp.platform}`;

    // Simple hash for client-side tracking (server does real validation)
    let hash = 0;
    for (let i = 0; i < fpString.length; i++) {
        const char = fpString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    return hash.toString(36);
}

/**
 * Send fingerprint data with auth requests (optional enhancement)
 */
export function getFingerprintHeaders(): Record<string, string> {
    const fp = collectFingerprint();

    return {
        'X-Screen-Resolution': fp.screenResolution,
        'X-Timezone': fp.timezone,
        'X-Platform': fp.platform
    };
}
