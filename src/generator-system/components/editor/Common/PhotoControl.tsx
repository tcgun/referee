import React from "react";
import { AppState } from "../../../types";

interface Props {
    label: string;
    image?: string;
    x: number;
    y: number;
    scale?: number;
    onUpdate: (data: { image?: string; x?: number; y?: number; scale?: number }) => void;
    accentColor?: string;
    showControls?: boolean;
}

const PhotoControl: React.FC<Props> = ({
    label,
    image: imageUrl,
    x: xVal,
    y: yVal,
    scale: scaleVal = 1,
    onUpdate,
    accentColor = "v-yellow",
    showControls = true
}) => {
    const accentClass = accentColor.startsWith("bg-") ? accentColor : `bg-${accentColor}`;
    const borderClass = accentColor.startsWith("border-") ? accentColor : `border-${accentColor}`;
    const textClass = accentClass.replace('bg-', 'text-');

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.onload = () => {
                    // Maximum dimensions for optimization
                    const MAX_WIDTH = 2500;
                    const MAX_HEIGHT = 2500;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        // Using higher quality for optimization without much loss
                        const optimizedImage = canvas.toDataURL('image/jpeg', 0.95);
                        onUpdate({
                            image: optimizedImage,
                            x: 50,
                            y: 50,
                            scale: 1
                        });
                    }
                };
                img.src = reader.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleReset = () => {
        onUpdate({
            x: 50,
            y: 50,
            scale: 1
        });
    };

    const updatePos = (x: number, y: number) => {
        onUpdate({
            x: Math.min(Math.max(x, 0), 100),
            y: Math.min(Math.max(y, 0), 100)
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase opacity-70">{label}</span>
                {imageUrl && (
                    <button
                        onClick={() => onUpdate({ image: undefined })}
                        className="text-[10px] font-bold text-red-500 underline"
                    >
                        KALDIR
                    </button>
                )}
            </div>

            <div className="h-28 w-full border-2 border-dashed border-black/30 rounded flex items-center justify-center overflow-hidden hover:border-black transition-colors bg-white relative">
                {imageUrl ? (
                    <img src={imageUrl} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-[10px] text-center font-bold px-4 opacity-40">Görsel Yükle</span>
                )}
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                />
            </div>

            {imageUrl && showControls && (
                <div className="mt-4 pt-4 border-t border-black/5 animate-in fade-in slide-in-from-top-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="font-bold text-[10px] uppercase opacity-60">Fotoğrafı Konumlandır</span>
                        <button
                            onClick={handleReset}
                            className={`text-[10px] font-black underline hover:${textClass} transition-colors`}
                        >
                            SIFIRLA
                        </button>
                    </div>

                    <div
                        className="h-32 w-full bg-slate-100 rounded-brutal border-2 border-black relative cursor-move overflow-hidden"
                        onMouseMove={(e) => {
                            if (e.buttons === 1) {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                                const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                                updatePos(x, y);
                            }
                        }}
                        onMouseDown={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                            const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                            updatePos(x, y);
                        }}
                    >
                        <img
                            src={imageUrl}
                            className="w-full h-full object-cover opacity-20 pointer-events-none"
                        />
                        <div
                            className={`absolute w-6 h-6 border-2 border-black ${accentClass} rounded-full -translate-x-1/2 -translate-y-1/2 shadow-brutal pointer-events-none flex items-center justify-center after:content-[''] after:w-1 after:h-1 after:bg-black after:rounded-full`}
                            style={{ left: `${xVal}%`, top: `${yVal}%` }}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-black italic">
                                <span>YATAY (X)</span>
                                <span>%{xVal}</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={xVal}
                                onChange={(e) => updatePos(parseInt(e.target.value), yVal)}
                                className={`w-full accent-${accentColor.replace('bg-', '').replace('v-', '')} cursor-pointer`}
                            />
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-black italic">
                                <span>DİKEY (Y)</span>
                                <span>%{yVal}</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={yVal}
                                onChange={(e) => updatePos(xVal, parseInt(e.target.value))}
                                className={`w-full accent-${accentColor.replace('bg-', '').replace('v-', '')} cursor-pointer`}
                            />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <div className="flex justify-between text-[9px] font-black italic">
                                <span>ÖLÇEK (BOYUT)</span>
                                <span>{scaleVal.toFixed(1)}x</span>
                            </div>
                            <input
                                type="range"
                                min="0.5"
                                max="3"
                                step="0.1"
                                value={scaleVal}
                                onChange={(e) => onUpdate({ scale: parseFloat(e.target.value) })}
                                className={`w-full accent-${accentColor.replace('bg-', '').replace('v-', '')} cursor-pointer`}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PhotoControl;
