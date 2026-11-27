/**
 * Contact link helpers
 * ---------------------------------------------------------------------------
 * Applicants type free-form contact details ("0912 345 6789", "Juan Dela
 * Cruz", "facebook.com/juan"). These helpers convert them into valid
 * `tel:`, `mailto:` and Facebook URLs so every action button in the
 * Applicants page actually opens something usable.
 */

/** Strip formatting and normalize local PH numbers to +63 E.164-ish digits */
export const sanitizePhoneNumber = (raw?: string | null): string => {
    const value = (raw || '').trim();
    if (!value) return '';

    // Keep a single leading "+" only, drop spaces, dashes, parentheses
    const cleaned = value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
    const digits = cleaned.replace(/\D/g, '');
    if (!digits) return '';

    if (cleaned.startsWith('+')) return `+${digits}`;
    if (digits.startsWith('00')) return `+${digits.slice(2)}`;
    // 639171234567 -> +639171234567
    if (digits.length === 12 && digits.startsWith('63')) return `+${digits}`;
    // Local trunk-prefix numbers: 09171234567 / 0281234567 -> +63...
    if (digits.startsWith('0') && digits.length >= 9 && digits.length <= 11) {
        return `+63${digits.slice(1)}`;
    }
    // 9171234567 -> +639171234567
    if (digits.length === 10 && digits.startsWith('9')) return `+63${digits}`;

    return digits;
};

export const getTelHref = (raw?: string | null): string | null => {
    const phone = sanitizePhoneNumber(raw);
    return phone ? `tel:${phone}` : null;
};

export const getMailtoHref = (
    raw?: string | null,
    subject?: string,
    body?: string
): string | null => {
    const email = (raw || '').trim().replace(/\s+/g, '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

    const params: string[] = [];
    if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
    if (body) params.push(`body=${encodeURIComponent(body)}`);

    return `mailto:${email}${params.length ? `?${params.join('&')}` : ''}`;
};

/**
 * Opens Gmail's web compose window addressed to the given email. Used on desktop
 * where `mailto:` often does nothing because no mail client is configured.
 */
export const getGmailComposeHref = (
    raw?: string | null,
    subject?: string,
    body?: string
): string | null => {
    const email = (raw || '').trim().replace(/\s+/g, '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

    const params = new URLSearchParams({ view: 'cm', fs: '1', to: email });
    if (subject) params.set('su', subject);
    if (body) params.set('body', body);

    return `https://mail.google.com/mail/?${params.toString()}`;
};

/**
 * Email action that lands in Gmail: the Gmail app/browser handler on phones
 * (`mailto:`) and the Gmail web composer on desktop.
 */
export const getEmailHref = (
    raw?: string | null,
    subject?: string,
    body?: string
): string | null => {
    const isMobile =
        typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    return isMobile ? getMailtoHref(raw, subject, body) : getGmailComposeHref(raw, subject, body);
};

/**
 * Accepts a full URL, "facebook.com/username", "@username", a bare username,
 * a "profile.php?id=..." path, or a plain display name. Plain names cannot be
 * resolved into a profile URL, so they fall back to a Facebook search.
 */
export const getFacebookUrl = (raw?: string | null): string | null => {
    const value = (raw || '').trim();
    if (!value) return null;

    // Already a full URL
    if (/^https?:\/\//i.test(value)) return value.replace(/^http:\/\//i, 'https://');

    // Domain without protocol: facebook.com/xxx, fb.com/xxx, m.me/xxx
    if (/^(www\.|m\.)?(facebook\.com|fb\.com|fb\.me|m\.me)(\/|$)/i.test(value)) {
        return `https://${value.replace(/^\/+/, '')}`;
    }

    // Path-only input: /juan.dela.cruz or profile.php?id=1000...
    if (value.startsWith('/')) {
        return `https://www.facebook.com/${value.replace(/^\/+/, '')}`;
    }
    if (/^profile\.php\?/i.test(value)) {
        return `https://www.facebook.com/${value}`;
    }

    // Handle input: @juan, juan.dela.cruz, juandelacruz123
    const handle = value.replace(/^@+/, '');
    const looksLikeHandle =
        !/\s/.test(handle) &&
        /^[A-Za-z0-9._-]{3,}$/.test(handle) &&
        (/[._-]/.test(handle) || /\d/.test(handle) || handle === handle.toLowerCase());
    if (looksLikeHandle) {
        return `https://www.facebook.com/${handle}`;
    }

    // Display name: best effort — open Facebook search for that name
    return `https://www.facebook.com/search/top?q=${encodeURIComponent(value)}`;
};

/** Turn the free-form "other socials" text into a clickable link when possible */
export const getSocialUrl = (raw?: string | null): string | null => {
    const value = (raw || '').trim();
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value;
    if (/^[^\s/]+\.[^\s/]{2,}(\/.*)?$/.test(value)) return `https://${value}`;
    return null;
};
