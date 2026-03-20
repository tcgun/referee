import React, { useEffect, useState, useRef } from "react";
import { useStore } from "../store/useStore";
import { PRESETS } from "../types";
import Template1 from "./Template1";
import Template2 from "./Template2";
import Template3 from "./Template3";
import Template4 from "./Template4";
import Template5 from "./Template5";
import { ZoomIn, ZoomOut, RotateCcw, Download, Save } from "lucide-react";

interface Props {
    domRef: React.RefObject<HTMLDivElement | null>;
    onSavePreset: () => void;
    onDownload: () => void;
}

const Preview: React.FC<Props> = ({ domRef, onSavePreset, onDownload }) => {
    const { template, currentPreset } = useStore();
    const [autoScale, setAutoScale] = useState(0.2);
    const [manualScaleOffset, setManualScaleOffset] = useState(0); // Offset from autoScale
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const preset = PRESETS[currentPreset] || PRESETS["ratio-1-1"];

    // Drag to scroll state
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                const padding = width < 500 ? 20 : 100;
                const availableWidth = width - padding;
                const availableHeight = height - padding;

                const scaleX = availableWidth / preset.width;
                const scaleY = availableHeight / preset.height;

                const safeScale = Math.min(scaleX, scaleY, 0.95);
                setAutoScale(safeScale);
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [preset.width, preset.height]);

    const currentScale = Math.min(Math.max(autoScale + manualScaleOffset, 0.1), 3);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setStartY(e.pageY - scrollRef.current.offsetTop);
        setScrollLeft(scrollRef.current.scrollLeft);
        setScrollTop(scrollRef.current.scrollTop);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const y = e.pageY - scrollRef.current.offsetTop;
        const walkX = (x - startX) * 1.5; // Scroll speed multiplier
        const walkY = (y - startY) * 1.5;
        scrollRef.current.scrollLeft = scrollLeft - walkX;
        scrollRef.current.scrollTop = scrollTop - walkY;
    };

    const renderTemplate = () => {
        switch (template) {
            case "template2":
                return <Template2 domRef={domRef} />;
            case "template3":
                return <Template3 domRef={domRef} />;
            case "template4":
                return <Template4 domRef={domRef} />;
            case "template5":
                return <Template5 domRef={domRef} />;
            default:
                return <Template1 domRef={domRef} />;
        }
    };

    return (
        <div
            ref={containerRef}
            className="flex-1 h-full bg-v-gray relative overflow-hidden flex flex-col"
        >
            {/* Zoom Controls Overlay */}
            <div className="absolute top-6 right-6 z-50 flex flex-col gap-2">
                <button
                    onClick={() => setManualScaleOffset((prev: number) => prev + 0.1)}
                    className="w-10 h-10 bg-white border-2 border-black shadow-brutal flex items-center justify-center hover:bg-v-yellow transition-colors"
                    title="Yakınlaştır"
                >
                    <ZoomIn size={20} />
                </button>
                <button
                    onClick={() => setManualScaleOffset((prev: number) => prev - 0.1)}
                    className="w-10 h-10 bg-white border-2 border-black shadow-brutal flex items-center justify-center hover:bg-v-yellow transition-colors"
                    title="Uzaklaştır"
                >
                    <ZoomOut size={20} />
                </button>
                <button
                    onClick={() => setManualScaleOffset(0)}
                    className="w-10 h-10 bg-white border-2 border-black shadow-brutal flex items-center justify-center hover:bg-v-yellow transition-colors"
                    title="Sıfırla"
                >
                    <RotateCcw size={20} />
                </button>
            </div>

            {/* Scrollable Area */}
            <div
                ref={scrollRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                className={`flex-1 overflow-auto p-12 flex items-center justify-center scrollbar-hide select-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
            >
                <div className="flex flex-col items-center gap-6">
                    <div
                        style={{
                            transform: `scale(${currentScale})`,
                            transformOrigin: "center center",
                            transition: (manualScaleOffset === 0 && !isDragging) ? "transform 0.2s ease-out" : "none",
                            width: preset.width,
                            height: preset.height,
                            minWidth: preset.width,
                            minHeight: preset.height,
                        }}
                        className="shrink-0 pointer-events-none"
                    >
                        {renderTemplate()}
                    </div>

                    {/* Action Buttons (Download & Save) */}
                    <div className="flex gap-4 w-full max-w-md justify-center shrink-0 z-50">
                        <button
                            onClick={onDownload}
                            className="flex-1 brutal-button bg-v-yellow text-black flex items-center justify-center gap-2 py-4 font-black italic shadow-brutal hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
                        >
                            <Download className="w-6 h-6" /> İNDİR (PNG)
                        </button>
                        <button
                            onClick={onSavePreset}
                            className="flex-1 brutal-button bg-black text-white flex items-center justify-center gap-2 py-4 font-black italic shadow-[4px_4px_0px_0px_rgba(250,250,0,0.5)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(250,250,0,0.4)] transition-all border-2 border-white/20"
                        >
                            <Save className="w-6 h-6" /> KAYDET
                        </button>
                    </div>
                </div>
            </div>

            {/* Rapor çubuğu */}
            <div className="absolute bottom-4 left-6 bg-black text-white px-3 py-1 rounded-full text-xs font-mono flex items-center gap-3 z-40">
                <span>{preset.width} x {preset.height} px</span>
                <span className="opacity-40">|</span>
                <span>{template.toUpperCase()}</span>
                <span className="opacity-40">|</span>
                <span className="text-v-yellow">%{Math.round(currentScale * 100)}</span>
                {isDragging && <span className="text-white/40 ml-2 animate-pulse">KAYDIRILIYOR...</span>}
            </div>
        </div>
    );
};

export default Preview;
