import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MockDb } from '../services/mockDb';
import { RMA } from '../types';
import { EditRMADrawer } from '../components/EditRMADrawer';
import { Loader2 } from 'lucide-react';

export const EditRMA: React.FC = () => {
    const { rmaId } = useParams<{ rmaId: string }>();
    const navigate = useNavigate();
    const decodedId = rmaId ? decodeURIComponent(rmaId) : '';
    const cachedRMA = decodedId
        ? MockDb.getCachedRMAs()?.find(r => r.id === decodedId) || null
        : null;
    const [rma, setRma] = useState<RMA | null>(() => cachedRMA);
    const [loading, setLoading] = useState(() => !cachedRMA);

    useEffect(() => {
        const fetchRMA = async () => {
            if (!decodedId) return;
            if (!MockDb.getCachedRMAs()?.some(r => r.id === decodedId)) {
                setLoading(true);
            }
            try {
                const found = await MockDb.getRMAById(decodedId);
                if (found) {
                    setRma(found);
                } else {
                    navigate(-1);
                }
            } catch (error) {
                console.error("Failed to fetch RMA", error);
            } finally {
                setLoading(false);
            }
        };
        fetchRMA();
    }, [decodedId, navigate]);

    const handleSave = async (targetId: string, updates: Partial<RMA>, diffs: { field: string, old: string, new: string }[]) => {
        await MockDb.updateRMA(targetId, { ...updates, updatedAt: new Date().toISOString() });

        if (diffs.length > 0) {
            const changeDesc = diffs.map(d => `${d.field}: ${d.old} -> ${d.new}`).join(', ');
            await MockDb.addTimelineEvent(targetId, {
                type: updates.status ? 'STATUS_CHANGE' : 'SYSTEM',
                description: `Edited: ${changeDesc}`,
                user: MockDb.getCurrentUser()?.name || 'Staff'
            });
        }
    };

    const handleClose = () => {
        if (window.history.state && typeof window.history.state.idx === 'number' && window.history.state.idx > 0) {
            navigate(-1);
        } else if (rma) {
            navigate(`/admin/job/${encodeURIComponent(rma.groupRequestId || rma.id)}`);
        } else {
            navigate('/admin/rmas');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex items-center gap-3 bg-white dark:bg-[#1c1c1e] px-6 py-3 rounded-full border border-gray-200 dark:border-[#333] shadow-sm">
                    <Loader2 className="w-5 h-5 animate-spin text-[#0071e3]" />
                    <span className="text-sm font-medium text-gray-500">Loading...</span>
                </div>
            </div>
        );
    }

    if (!rma) return null;

    return (
        <EditRMADrawer
            isOpen={true}
            onClose={handleClose}
            rma={rma}
            onSave={handleSave}
        />
    );
};
