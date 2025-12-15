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

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    try {
        // Option 1: Try to use full service account JSON (more reliable)
        const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
        if (serviceAccountJson) {
            try {
                const serviceAccount = typeof serviceAccountJson === 'string' 
                    ? JSON.parse(serviceAccountJson) 
                    : serviceAccountJson;
                
                if (serviceAccount.private_key) {
                    serviceAccount.private_key = formatPrivateKey(serviceAccount.private_key);
                }
                
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
            } catch (jsonError) {
                console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', jsonError);
                throw jsonError;
            }
        } else {
            // Option 2: Use individual environment variables
            const projectId = process.env.FIREBASE_PROJECT_ID;
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            const privateKey = process.env.FIREBASE_PRIVATE_KEY;

            // Only initialize if all required credentials are present
            if (projectId && clientEmail && privateKey) {
                const formattedKey = formatPrivateKey(privateKey);
                
                admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId,
                        clientEmail,
                        privateKey: formattedKey,
                    }),
                });
            }
        }
    } catch (error) {
        // Log error but don't throw - this allows build to continue
        // Runtime errors will occur when firestore is actually used
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Firebase Admin SDK initialization error:', errorMessage);
        
        // In development, provide more details
        if (process.env.NODE_ENV === 'development' && error instanceof Error) {
            console.error('Stack trace:', error.stack);
        }
    }
}

// Get firestore instance only if initialization succeeded
// This prevents build failures while still allowing runtime errors when actually used
let firestore: admin.firestore.Firestore;

if (admin.apps.length > 0) {
    firestore = admin.firestore();
} else {
    // If initialization failed, create a dummy object that will throw at runtime
    // This prevents the build from failing while providing clear errors when used
    firestore = {} as admin.firestore.Firestore;
    // Note: This will cause runtime errors when firestore methods are called,
    // but allows the build to complete successfully
}

export { firestore };
