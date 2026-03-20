import React from "react";
import { useStore } from "../../store/useStore";
import { Image as ImageIcon } from "lucide-react";

interface Props {
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const SponsorSection: React.FC<Props> = ({ handleChange }) => {
    const { showSponsor, sponsorName, sponsorLogo, setState } = useStore();

    return (
        <div className="space-y-4 pt-8 border-t-2 border-black border-dashed">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-black uppercase text-black">SPONSOR</h3>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs bg-black text-white px-2 py-1 rounded-brutal">
                    <input
                        type="checkbox"
                        name="showSponsor"
                        checked={showSponsor || false}
                        onChange={handleChange}
                        className="w-4 h-4 accent-v-yellow"
                    />
                    AKTİF
                </label>
            </div>

            {showSponsor && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="grid grid-cols-[1fr,60px] gap-3">
                        <label className="block space-y-1">
                            <span className="font-bold text-[10px] opacity-40 uppercase">Sponsor Adı</span>
                            <input
                                type="text"
                                name="sponsorName"
                                value={sponsorName || ""}
                                onChange={handleChange}
                                className="brutal-input h-10 text-sm font-bold"
                                placeholder="Sponsorunuz"
                            />
                        </label>
                        <div className="space-y-1">
                            <span className="font-bold text-[10px] opacity-40 uppercase">Logo</span>
                            <div className="h-10 w-full border-2 border-dashed border-black/30 rounded flex items-center justify-center overflow-hidden bg-white relative">
                                {sponsorLogo ? <img src={sponsorLogo} className="w-full h-full object-contain" /> : <ImageIcon size={16} className="opacity-30" />}
                                <input type="file" accept="image/*" onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => setState(prev => ({ ...prev, sponsorLogo: reader.result as string }));
                                        reader.readAsDataURL(file);
                                    }
                                }} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SponsorSection;
