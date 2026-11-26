
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MockDb } from '../services/mockDb';
import { RMA } from '../types';
import { EditRMADrawer } from '../components/EditRMADrawer';
import { Loader2 } from 'lucide-react';

export const EditRMA: React.FC = () => {
    const { rmaId } = useParams<{ rmaId: string }>();
    const navigate = useNavigate();
    const [rma, setRma] = useState<RMA | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRMA = async () => {
            if (!rmaId) return;
            setLoading(true);
            try {
                const found = await MockDb.getRMAById(rmaId);
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
    }, [rmaId]);

    const handleSave = async (rmaId: string, updates: Partial<RMA>, diffs: { field: string, old: string, new: string }[]) => {
        await MockDb.updateRMA(rmaId, { ...updates, updatedAt: new Date().toISOString() });

        const changeDesc = diffs.map(d => `${d.field}: ${d.old} -> ${d.new}`).join(', ');
        await MockDb.addTimelineEvent(rmaId, {
            type: 'SYSTEM',
            description: `Edited: ${changeDesc}`,
            user: MockDb.getCurrentUser()?.name || 'Staff'
        });
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
