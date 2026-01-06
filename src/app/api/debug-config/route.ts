import { NextResponse } from 'next/server';
import { getAdminApp } from '@/firebase/admin'; // I need to export getAdminApp first
import * as admin from 'firebase-admin';

export async function GET() {
    let adminProjectId = 'unknown';
    // Accessing private internal property (options) is tricky in TS, but we can try credential
    // Or just check process.env inside the function context

    try {
        if (admin.apps.length > 0) {
            const app = admin.apps[0];
            // @ts-ignore
            adminProjectId = app?.options?.credential?.projectId || app?.options?.projectId || 'could-not-determine-from-app';
        }
    } catch (e) {
        adminProjectId = 'error-checking';
    }

    return NextResponse.json({
        env_project_id: process.env.FIREBASE_PROJECT_ID || 'missing',
        service_account_env_exists: !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
        admin_sdk_project_id: adminProjectId,
        client_public_project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'missing'
    });
}
