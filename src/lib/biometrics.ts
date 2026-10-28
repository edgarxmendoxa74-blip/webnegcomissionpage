import { supabase } from './supabase';

const BIOMETRIC_KEY_PREFIX = 'webnegosyo_biometric_';
const BIOMETRIC_ACTIVE_USER_KEY = 'webnegosyo_biometric_active_user';

export interface BiometricRegistration {
    username: string;
    credentialId: string;
    registeredAt: string;
    deviceName: string;
    internalEmail: string;
    authSecret?: string; // encrypted or stored for seamless re-auth
    refreshToken?: string;
}

// Convert Buffer to Base64URL
export function bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Convert Base64URL to Uint8Array
export function base64ToBuffer(base64: string): ArrayBuffer {
    const padded = base64.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Check if the current browser and device support biometric authentication (Fingerprint, Touch ID, Windows Hello).
 */
export async function isBiometricsAvailable(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
        return false;
    }
    try {
        if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
            const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            return available;
        }
        return true;
    } catch {
        return false;
    }
}

/**
 * Get registered biometric info for a specific username or the default active device user.
 */
export function getRegisteredBiometrics(username?: string): BiometricRegistration | null {
    try {
        const targetUser = (username || localStorage.getItem(BIOMETRIC_ACTIVE_USER_KEY) || '').trim().toLowerCase();
        if (!targetUser) return null;
        const raw = localStorage.getItem(`${BIOMETRIC_KEY_PREFIX}${targetUser}`);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

/**
 * Get the currently registered biometric username on this device (if any).
 */
export function getActiveBiometricUsername(): string | null {
    try {
        return localStorage.getItem(BIOMETRIC_ACTIVE_USER_KEY);
    } catch {
        return null;
    }
}

/**
 * Register the user's fingerprint / platform biometrics on this device.
 */
export async function registerBiometrics(
    username: string,
    options?: { password?: string }
): Promise<BiometricRegistration> {
    if (typeof window === 'undefined' || !navigator.credentials?.create) {
        throw new Error('Biometric authentication is not supported by your browser.');
    }

    const cleanUsername = username.trim().toLowerCase();
    const internalEmail = `${cleanUsername}@webnegosyo.internal`;
    const userId = new TextEncoder().encode(cleanUsername);

    // Random challenge
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const credentialCreationOptions: CredentialCreationOptions = {
        publicKey: {
            challenge,
            rp: {
                name: 'WebNegosyo Management',
                id: window.location.hostname,
            },
            user: {
                id: userId,
                name: cleanUsername,
                displayName: cleanUsername,
            },
            pubKeyCredParams: [
                { alg: -7, type: 'public-key' },  // ES256
                { alg: -257, type: 'public-key' }, // RS256
            ],
            authenticatorSelection: {
                authenticatorAttachment: 'platform', // Built-in scanner (Fingerprint, Touch ID, Windows Hello)
                userVerification: 'required',
                requireResidentKey: false,
            },
            timeout: 60000,
            attestation: 'none',
        },
    };

    // This triggers the device's native fingerprint/biometric prompt!
    const credential = (await navigator.credentials.create(credentialCreationOptions)) as PublicKeyCredential;
    if (!credential) {
        throw new Error('Fingerprint registration cancelled or failed.');
    }

    const credentialId = bufferToBase64(credential.rawId);

    // Get current session refresh token if logged in
    const { data: { session } } = await supabase.auth.getSession();
    const refreshToken = session?.refresh_token;

    // Detect device name
    const ua = navigator.userAgent;
    let deviceName = 'This Device';
    if (/Android/i.test(ua)) deviceName = 'Android Device';
    else if (/iPhone|iPad/i.test(ua)) deviceName = 'Apple Device';
    else if (/Windows/i.test(ua)) deviceName = 'Windows PC (Hello)';
    else if (/Mac/i.test(ua)) deviceName = 'Mac (Touch ID)';

    const registration: BiometricRegistration = {
        username: cleanUsername,
        credentialId,
        registeredAt: new Date().toISOString(),
        deviceName,
        internalEmail,
        refreshToken,
        authSecret: options?.password ? btoa(options.password) : undefined,
    };

    // Save in localStorage
    localStorage.setItem(`${BIOMETRIC_KEY_PREFIX}${cleanUsername}`, JSON.stringify(registration));
    localStorage.setItem(BIOMETRIC_ACTIVE_USER_KEY, cleanUsername);

    return registration;
}

/**
 * Remove the registered fingerprint from this device.
 */
export function removeBiometrics(username?: string): void {
    try {
        const cleanUsername = (username || localStorage.getItem(BIOMETRIC_ACTIVE_USER_KEY) || '').trim().toLowerCase();
        if (cleanUsername) {
            localStorage.removeItem(`${BIOMETRIC_KEY_PREFIX}${cleanUsername}`);
            if (localStorage.getItem(BIOMETRIC_ACTIVE_USER_KEY) === cleanUsername) {
                localStorage.removeItem(BIOMETRIC_ACTIVE_USER_KEY);
            }
        }
    } catch (e) {
        console.error('Error removing biometrics:', e);
    }
}

/**
 * Sign in using the registered fingerprint on this device.
 */
export async function authenticateWithBiometrics(targetUsername?: string): Promise<{ username: string }> {
    if (typeof window === 'undefined' || !navigator.credentials?.get) {
        throw new Error('Biometrics not supported on this browser.');
    }

    const registration = getRegisteredBiometrics(targetUsername);
    if (!registration) {
        throw new Error('Walang nakarehistrong fingerprint sa device na ito. Mag-login muna gamit ang username at password, tapos pumunta sa My Profile para i-register ang fingerprint mo.');
    }

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const allowCredentials = registration.credentialId
        ? [{ id: base64ToBuffer(registration.credentialId), type: 'public-key' as const }]
        : undefined;

    const credentialRequestOptions: CredentialRequestOptions = {
        publicKey: {
            challenge,
            allowCredentials,
            userVerification: 'required',
            timeout: 60000,
            rpId: window.location.hostname,
        },
    };

    // This triggers the device's native fingerprint scan prompt!
    const assertion = await navigator.credentials.get(credentialRequestOptions);
    if (!assertion) {
        throw new Error('Fingerprint verification cancelled.');
    }

    // Fingerprint verification succeeded on the hardware!
    // Now establish the Supabase auth session:
    let loggedIn = false;

    // 1. Try saved credentials if available
    if (registration.authSecret) {
        try {
            const password = atob(registration.authSecret);
            const { error } = await supabase.auth.signInWithPassword({
                email: registration.internalEmail,
                password,
            });
            if (!error) loggedIn = true;
        } catch (e) {
            console.warn('Password sign in via biometrics fallback:', e);
        }
    }

    // 2. Try refresh token if password sign-in didn't work
    if (!loggedIn && registration.refreshToken) {
        try {
            const { data, error } = await supabase.auth.refreshSession({
                refresh_token: registration.refreshToken,
            });
            if (!error && data.session) {
                loggedIn = true;
                // Update refreshed token
                registration.refreshToken = data.session.refresh_token;
                localStorage.setItem(`${BIOMETRIC_KEY_PREFIX}${registration.username}`, JSON.stringify(registration));
            }
        } catch (e) {
            console.warn('Refresh session failed:', e);
        }
    }

    // 3. Check if active session already matches user
    if (!loggedIn) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email === registration.internalEmail) {
            loggedIn = true;
        }
    }

    if (!loggedIn) {
        throw new Error('Naka-expire na ang biometric session. Mangyaring mag-log in gamit ang password minsan pa upang ma-update ang iyong fingerprint credentials.');
    }

    return { username: registration.username };
}
