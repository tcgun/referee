import * as admin from 'firebase-admin';

const formatPrivateKey = (key: string): string => {
    if (!key) {
        return key;
    }

    const header = '-----BEGIN PRIVATE KEY-----';
    const footer = '-----END PRIVATE KEY-----';

    // Trim whitespace
    let cleaned = key.trim();

    // Remove surrounding quotes if present (handles both single and double quotes)
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
        (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
        cleaned = cleaned.slice(1, -1);
    }

    // Try to parse as JSON string if it looks like one (handles double-encoded strings)
    // This handles cases where the env var was stored as a JSON string value
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        try {
            cleaned = JSON.parse(cleaned);
        } catch {
            // Not valid JSON, continue with original
        }
    }

    // Replace escaped newlines with actual newlines
    // This handles: \n (single escape) and \\n (double escape) -> both become \n
    cleaned = cleaned.replace(/\\n/g, '\n');

    // Check if key has proper PEM structure
    if (!cleaned.includes(header) || !cleaned.includes(footer)) {
        // No PEM structure found, return as-is (might be invalid, but let Firebase SDK handle it)
        return cleaned;
    }

    const headerIndex = cleaned.indexOf(header);
    const footerIndex = cleaned.indexOf(footer);

    // Check if already properly formatted (has newline right after header and before footer)
    const hasNewlineAfterHeader = cleaned[headerIndex + header.length] === '\n';
    const hasNewlineBeforeFooter = cleaned[footerIndex - 1] === '\n';

    // If properly formatted, return as-is
    if (hasNewlineAfterHeader && hasNewlineBeforeFooter) {
        // Verify it has newlines in the body too (not just a single line)
        const body = cleaned.substring(headerIndex + header.length + 1, footerIndex - 1);
        if (body.includes('\n')) {
            return cleaned;
        }
    }

    // Need to reformat: extract body, remove all whitespace, then chunk into 64-char lines
    let bodyRaw = cleaned.substring(headerIndex + header.length, footerIndex);
    // Remove all whitespace (spaces, tabs, newlines)
    bodyRaw = bodyRaw.replace(/[\s\n\r\t]/g, '');

    // Chunk into 64-character lines
    const bodyChunked = bodyRaw.match(/.{1,64}/g)?.join('\n') || bodyRaw;

    return `${header}\n${bodyChunked}\n${footer}`;
};


let adminApp: admin.app.App | undefined;

function getAdminApp() {
    if (adminApp) return adminApp;

    if (admin.apps.length > 0) {
        adminApp = admin.apps[0]!;
        return adminApp;
    }

    try {
        const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
        if (serviceAccountJson) {
            const serviceAccount = typeof serviceAccountJson === 'string'
                ? JSON.parse(serviceAccountJson)
                : serviceAccountJson;

            if (serviceAccount.private_key) {
                serviceAccount.private_key = formatPrivateKey(serviceAccount.private_key);
            }

            adminApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        } else {
            const projectId = process.env.FIREBASE_PROJECT_ID;
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            const privateKey = process.env.FIREBASE_PRIVATE_KEY;

            if (projectId && clientEmail && privateKey) {
                const formattedKey = formatPrivateKey(privateKey);
                adminApp = admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId,
                        clientEmail,
                        privateKey: formattedKey,
                    }),
                });
            }
        }
    } catch (error) {
        console.error('Firebase Admin init error:', error);
    }

    return adminApp;
}

export function getAdminDb() {
    const app = getAdminApp();
    if (app) {
        return app.firestore();
    }
    // Return a proxy or throw specific error if critical
    throw new Error("Firebase Admin not initialized. Check server logs.");
}

export function getAdminAuth() {
    const app = getAdminApp();
    if (app) {
        return app.auth();
    }
    throw new Error("Firebase Admin not initialized for Auth.");
}

