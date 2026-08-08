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
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [rotation, setRotation] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    // Reset when modal opens or image changes
    useEffect(() => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setRotation(0);
    }, [imageUrl]);

    const handleZoomIn = useCallback(() => {
        setScale(prev => Math.min(prev + 0.5, 4.5));
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

    // Mouse wheel zoom handler
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.25 : -0.25;
        setScale(prev => {
            const nextScale = Math.min(Math.max(prev + delta, 0.8), 4.5);
            if (nextScale <= 1) setPosition({ x: 0, y: 0 });
            return nextScale;
        });
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

    if (!imageUrl) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-[99999] flex flex-col justify-between items-center p-3 sm:p-6 animate-fade-in select-none"
            onClick={onClose}
        >
            {/* Top Toolbar */}
            <div 
                className="w-full max-w-4xl flex items-center justify-between z-20 pt-2 pb-2 px-4 rounded-2xl bg-white/10 dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-white/10 text-white shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold truncate max-w-[200px] sm:max-w-md">{title}</span>
                    <span className="text-[10px] sm:text-xs font-mono font-bold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">
                        {Math.round(scale * 100)}%
                    </span>
                </div>

                {/* Control Action Buttons */}
                <div className="flex items-center gap-1 sm:gap-2">
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

            {/* Main Image Container */}
            <div 
                ref={containerRef}
                className="relative flex-1 w-full max-w-5xl my-3 flex items-center justify-center overflow-hidden rounded-3xl cursor-grab active:cursor-grabbing"
                onClick={e => e.stopPropagation()}
                onWheel={handleWheel}
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
                    className="max-w-full max-h-[75vh] object-contain transition-transform ease-out duration-75 origin-center rounded-2xl shadow-2xl pointer-events-auto"
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                        transition: isDragging ? 'none' : 'transform 0.15s ease-out'
                    }}
                />
            </div>

            {/* Bottom Hint Banner */}
            <div 
                className="z-20 px-4 py-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white/80 text-[11px] sm:text-xs flex items-center gap-2 pointer-events-none"
            >
                <Move className="w-3.5 h-3.5 text-blue-400" />
                <span>หมุนล้อเมาส์เพื่อ Zoom In/Out | ดับเบิ้ลคลิกเพื่อขยาย | คลิกแล้วลากเพื่อย้ายตำแหน่งรูป</span>
            </div>
        </div>
    );
};
