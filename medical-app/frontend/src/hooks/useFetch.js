import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export default function useFetch(url) {
    const { authFetch, logout } = useAuth();
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');

    const load = useCallback(async () => {
        if (!url) return;
        setLoading(true);
        setError('');
        try {
            const res = await authFetch(url);
            if (res.status === 401 || res.status === 403) { logout(); return; }
            if (!res.ok) { const d = await res.json(); setError(d.message); return; }
            setData(await res.json());
        } catch {
            setError('Erreur de connexion au serveur.');
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url]);

    useEffect(() => { load(); }, [load]);

    return { data, loading, error, refetch: load };
}
