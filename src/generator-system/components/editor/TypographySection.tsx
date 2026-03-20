import React from "react";
import { useStore } from "../../store/useStore";
import { Type } from "lucide-react";

const TypographySection: React.FC = () => {
    const { fontSizeMultiplier, updateState } = useStore();

    const handleMultiplierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateState("fontSizeMultiplier", parseFloat(e.target.value));
    };

    return (
        <div className="bg-[#f8f9fa] p-5 border-brutal border-black flex flex-col gap-4 shadow-[4px_4px_0px_#000]">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-black text-white rounded-md">
                    <Type size={18} />
                </div>
                <h4 className="text-lg font-black uppercase text-black tracking-tight">Yazı Boyutu Ayarı</h4>
            </div>

            <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-black uppercase text-black/60">
                    <span>Küçült</span>
                    <span className="bg-black text-white px-2 py-0.5 rounded-sm">
                        {fontSizeMultiplier.toFixed(1)}x
                    </span>
                    <span>Büyüt</span>
                </div>

                <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={fontSizeMultiplier}
                    onChange={handleMultiplierChange}
                    className="w-full h-3 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-black border border-black/10"
                />

                <p className="text-[10px] font-bold text-black/40 italic leading-tight">
                    * 9:16 boyutunda boşluk kalıyorsa bu değeri artırabilirsiniz. 1:1 boyutunda taşma olursa düşürün.
                </p>
            </div>
        </div>
    );
};

export default TypographySection;
