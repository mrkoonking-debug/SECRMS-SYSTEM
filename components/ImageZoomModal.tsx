import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Maximize2, X, Move } from 'lucide-react';

interface ImageZoomModalProps {
    imageUrl: string | null;
    onClose: () => void;
    title?: string;
}

export const ImageZoomModal: React.FC<ImageZoomModalProps> = ({
    imageUrl,
    onClose,
    title = 'รูปภาพอุปกรณ์ที่ส่งเคลม'
}) => {
    // Early return BEFORE hooks if no image URL is active
    if (!imageUrl) return null;

    return <ImageZoomModalContent imageUrl={imageUrl} onClose={onClose} title={title} />;
};

const ImageZoomModalContent: React.FC<{ imageUrl: string; onClose: () => void; title: string }> = ({
    imageUrl,
    onClose,
    title
}) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [rotation, setRotation] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    // Lock page background scrolling (body + main container) ONLY while modal content is mounted
    useEffect(() => {
        const originalBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const mainEl = document.querySelector('main');
        const originalMainOverflow = mainEl ? mainEl.style.overflow : '';
        if (mainEl) mainEl.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalBodyOverflow;
            if (mainEl) mainEl.style.overflow = originalMainOverflow;
        };
    }, []);

    const handleZoomIn = useCallback(() => {
        setScale(prev => Math.min(prev + 0.5, 5.0));
    }, []);

    const handleZoomOut = useCallback(() => {
        setScale(prev => {
            const next = Math.max(prev - 0.5, 0.8);
            if (next <= 1) setPosition({ x: 0, y: 0 });
            return next;
        });
    }, []);

    const handleReset = useCallback(() => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setRotation(0);
    }, []);

    const handleRotate = useCallback(() => {
        setRotation(prev => (prev + 90) % 360);
    }, []);

    // Attach non-passive wheel listener to prevent background page scroll & handle zoom
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const onNativeWheel = (e: WheelEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY < 0 ? 0.25 : -0.25;
            setScale(prev => {
                const nextScale = Math.min(Math.max(prev + delta, 0.8), 5.0);
                if (nextScale <= 1) setPosition({ x: 0, y: 0 });
                return nextScale;
            });
        };

        el.addEventListener('wheel', onNativeWheel, { passive: false });
        return () => {
            el.removeEventListener('wheel', onNativeWheel);
        };
    }, []);

    // Double click to toggle 100% / 250% zoom
    const handleDoubleClick = useCallback(() => {
        setScale(prev => {
            if (prev > 1.2) {
                setPosition({ x: 0, y: 0 });
                return 1;
            }
            return 2.5;
        });
    }, []);

    // Drag / Pan handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        if (scale <= 1) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            else if (e.key === '+' || e.key === '=') handleZoomIn();
            else if (e.key === '-') handleZoomOut();
            else if (e.key === '0' || e.key === 'r' || e.key === 'R') handleReset();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, handleZoomIn, handleZoomOut, handleReset]);

    return (
        <div 
            ref={containerRef}
            className="fixed inset-0 z-[99999] w-screen h-screen bg-black/90 backdrop-blur-md flex items-center justify-center overflow-hidden select-none animate-fade-in"
            onClick={onClose}
        >
            {/* Top Toolbar (Fixed to top of screen) */}
            <div 
                className="fixed top-4 left-1/2 -translate-x-1/2 z-[100000] w-[92%] max-w-3xl flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white/10 dark:bg-black/60 backdrop-blur-xl border border-white/20 dark:border-white/10 text-white shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span className="text-xs sm:text-sm font-bold truncate">{title}</span>
                    <span className="text-[10px] sm:text-xs font-mono font-bold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30 flex-shrink-0">
                        {Math.round(scale * 100)}%
                    </span>
                </div>

                {/* Control Action Buttons */}
                <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                    <button
                        type="button"
                        onClick={handleZoomIn}
                        className="p-2 hover:bg-white/20 active:bg-white/30 rounded-xl transition-colors text-white cursor-pointer"
                        title="ขยาย (+)"
                    >
                        <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button
                        type="button"
                        onClick={handleZoomOut}
                        className="p-2 hover:bg-white/20 active:bg-white/30 rounded-xl transition-colors text-white cursor-pointer"
                        title="ย่อ (-)"
                    >
                        <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button
                        type="button"
                        onClick={handleRotate}
                        className="p-2 hover:bg-white/20 active:bg-white/30 rounded-xl transition-colors text-white cursor-pointer"
                        title="หมุน 90°"
                    >
                        <RotateCw className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button
                        type="button"
                        onClick={handleReset}
                        className="p-2 hover:bg-white/20 active:bg-white/30 rounded-xl transition-colors text-white cursor-pointer"
                        title="รีเซ็ต (1:1)"
                    >
                        <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <div className="w-px h-5 bg-white/20 mx-1"></div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 bg-red-500/80 hover:bg-red-600 active:scale-95 rounded-xl transition-all text-white shadow-lg shadow-red-500/30 cursor-pointer"
                        title="ปิด (Esc)"
                    >
                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                </div>
            </div>

            {/* Main Fullscreen Image Viewport */}
            <div 
                className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
                onClick={e => e.stopPropagation()}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onDoubleClick={handleDoubleClick}
            >
                <img
                    ref={imgRef}
                    src={imageUrl}
                    alt={title}
                    draggable={false}
                    className="max-w-[90vw] max-h-[85vh] object-contain origin-center shadow-2xl pointer-events-auto rounded-xl"
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                        transition: isDragging ? 'none' : 'transform 0.15s ease-out'
                    }}
                />
            </div>

            {/* Bottom Hint Bar (Fixed to bottom of screen) */}
            <div 
                className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100000] px-4 py-2 rounded-full bg-white/10 dark:bg-black/60 backdrop-blur-xl border border-white/20 text-white/90 text-[11px] sm:text-xs flex items-center gap-2 pointer-events-none shadow-xl"
            >
                <Move className="w-3.5 h-3.5 text-blue-400" />
                <span>หมุนล้อเมาส์เพื่อ Zoom In/Out | ดับเบิ้ลคลิกเพื่อขยาย | คลิกแล้วลากเพื่อย้ายตำแหน่งรูป</span>
            </div>
        </div>
    );
};
