"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TeamsRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/pfdk');
    }, [router]);

    return (
        <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        </div>
    );
}
