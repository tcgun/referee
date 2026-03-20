import React from "react";
import { useStore } from "../../store/useStore";
import MatchInfoSection from "./MatchInfoSection";

interface Props {
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const Template1Form: React.FC<Props> = ({ handleChange }) => {
    const { positionText, refereeDecision, comment, highlight, author } = useStore();

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase opacity-50">Pozisyon Bilgisi</span>
                <input
                    type="text"
                    name="positionText"
                    value={positionText || ""}
                    onChange={handleChange}
                    placeholder="Örn: Ceza Sahası İçi"
                    className="brutal-input text-xs w-full"
                />
            </div>

            <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase opacity-50">Hakemin Kararı</span>
                <input
                    type="text"
                    name="refereeDecision"
                    value={refereeDecision || ""}
                    onChange={handleChange}
                    placeholder="Örn: PENALTI"
                    className="brutal-input text-xs w-full font-black"
                />
            </div>

            <label className="block space-y-1">
                <span className="font-bold text-sm">Yorumcuların Yorumu</span>
                <textarea
                    name="comment"
                    value={comment || ""}
                    onChange={handleChange}
                    rows={8}
                    className="brutal-input resize-y text-lg"
                    placeholder="Yorum veya görüş metni..."
                />
            </label>

            <label className="block space-y-1 text-v-pink">
                <span className="font-bold text-sm">Vurgulanacak Kelimeler (Yıldız * ile Ayırın)</span>
                <input
                    type="text"
                    name="highlight"
                    value={highlight || ""}
                    onChange={handleChange}
                    placeholder="örn: kelime1 * kelime2"
                    className="brutal-input border-v-pink"
                />
            </label>

            <label className="block space-y-1">
                <span className="font-bold text-[10px] uppercase opacity-60">KİM DEDİ?</span>
                <input
                    type="text"
                    name="author"
                    value={author || ""}
                    onChange={handleChange}
                    className="brutal-input h-12 text-lg font-black uppercase"
                    placeholder="İSİM YAZIN"
                />
            </label>

            <MatchInfoSection handleChange={handleChange} showLabel="ŞABLON 1" />
        </div>
    );
};

export default Template1Form;
