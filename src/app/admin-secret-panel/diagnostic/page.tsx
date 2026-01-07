"use client";

import { useState, useEffect } from 'react';
import { auth } from '@/firebase/client';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function DiagnosticPage() {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string>('');
    const [apiKey, setApiKey] = useState('');
    const [apiResult, setApiResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const storedKey = sessionStorage.getItem('admin_key');
        if (storedKey) setApiKey(storedKey);

        return onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                const t = await u.getIdToken();
                setToken(t);
            }
        });
    }, []);

    const runDiagnostic = async () => {
        setLoading(true);
        setApiResult(null);
        try {
            const res = await fetch(`/api/debug?key=${apiKey}`, {
                headers: {
                    'x-admin-key': apiKey,
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            setApiResult({ status: res.status, data });
        } catch (e: any) {
            setApiResult({ error: e.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto space-y-6 bg-slate-50 min-h-screen text-slate-900">
            <h1 className="text-2xl font-bold border-b pb-4">Sistem Tanılama (Diagnostics)</h1>

            <div className="space-y-4">
                <section className="bg-white p-4 rounded shadow border border-slate-200">
                    <h2 className="font-bold text-lg mb-2 text-blue-600">1. Client Auth Durumu</h2>
                    <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                        <div className="font-semibold text-slate-500">Kullanıcı:</div>
                        <div className={user ? "text-green-600 font-bold" : "text-red-500"}>
                            {user ? user.email : "Giriş Yapılmamış"}
                        </div>

                        <div className="font-semibold text-slate-500">UID:</div>
                        <div className="font-mono text-xs bg-slate-100 p-1 rounded">
                            {user?.uid || "-"}
                        </div>

                        <div className="font-semibold text-slate-500">Token:</div>
                        <div className="font-mono text-xs bg-slate-100 p-1 rounded truncate">
                            {token ? token.substring(0, 20) + "..." : "Yok"}
                        </div>
                    </div>
                </section>

                <section className="bg-white p-4 rounded shadow border border-slate-200">
                    <h2 className="font-bold text-lg mb-2 text-purple-600">2. API Bağlantı Testi</h2>

                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={apiKey}
                            onChange={e => setApiKey(e.target.value)}
                            placeholder="Admin Key giriniz..."
                            className="border p-2 rounded flex-1 text-sm bg-slate-50"
                        />
                        <button
                            onClick={runDiagnostic}
                            disabled={loading}
                            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Kontrol Ediliyor...' : 'Testi Başlat'}
                        </button>
                    </div>

                    {apiResult && (
                        <div className="bg-slate-900 text-green-400 p-4 rounded text-xs font-mono overflow-auto max-h-96">
                            <pre>{JSON.stringify(apiResult, null, 2)}</pre>
                        </div>
                    )}
                </section>

                <div className="text-xs text-slate-500 mt-8">
                    <p>NOT: Bu sayfa sadece debug amaçlıdır. Production ortamında environment variable'ların yüklendiğini doğrulamak için kullanılır.</p>
                </div>
            </div>
        </div>
    );
}
