
import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    state: State = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);

        // Auto-reload once for chunk load errors (Vite app updates)
        const isChunkLoadError = error?.message?.match(/Failed to fetch dynamically imported module/i) || 
                                 error?.message?.match(/Importing a module script failed/i) ||
                                 error?.message?.match(/dynamically imported module/i);
                                 
        if (isChunkLoadError) {
            const chunkFailedMessage = 'chunk_failed_timestamp';
            const lastReload = sessionStorage.getItem(chunkFailedMessage);
            const now = Date.now();
            
            // Allow auto-reload once every 10 seconds to prevent infinite loops
            if (!lastReload || (now - parseInt(lastReload, 10)) > 10000) {
                sessionStorage.setItem(chunkFailedMessage, now.toString());
                window.location.reload();
            }
        }
    }

    handleRetry = () => {
        const isChunkLoadError = this.state.error?.message?.match(/Failed to fetch dynamically imported module/i) || 
                                 this.state.error?.message?.match(/Importing a module script failed/i) ||
                                 this.state.error?.message?.match(/dynamically imported module/i);
                                 
        if (isChunkLoadError) {
            window.location.reload();
        } else {
            this.setState({ hasError: false, error: null });
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] dark:bg-[#131314] px-4">
                    <div className="text-center max-w-md bg-white dark:bg-[#16161a] border border-gray-200/80 dark:border-white/[0.08] p-8 rounded-3xl apple-card shadow-xl">
                        <div className="w-20 h-20 rounded-3xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-10 h-10" />
                        </div>
                        <h1 className="text-2xl font-bold text-[#1d1d1f] dark:text-white mb-2">
                            เกิดข้อผิดพลาด
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                            ระบบเกิดปัญหาที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง
                        </p>
                        {this.state.error && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 font-mono bg-gray-100 dark:bg-[#1c1c1e] rounded-xl px-4 py-2 mb-6 break-all">
                                {this.state.error.message}
                            </p>
                        )}
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={this.handleRetry}
                                className="w-full py-3 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/30"
                            >
                                <RefreshCw className="w-4 h-4" /> ลองใหม่
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="w-full py-3 bg-gray-100 dark:bg-[#2c2c2e] text-gray-600 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-[#3a3a3c] transition-colors"
                            >
                                กลับหน้าหลัก
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
