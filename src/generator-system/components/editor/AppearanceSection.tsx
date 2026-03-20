import React from "react";
import { useStore } from "../../store/useStore";
import { PRESETS } from "../../types";
import { Image as ImageIcon } from "lucide-react";

interface Props {
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const AppearanceSection: React.FC<Props> = ({ handleChange }) => {
    const { currentPreset, template, pattern, resetAllPhotos } = useStore();

    const handleResetPhotos = () => {
        if (window.confirm("Bütün yüklü fotoğrafları silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve uygulamanın belleğini temizler.")) {
            resetAllPhotos();
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-black uppercase flex items-center gap-2">
                <ImageIcon className="w-6 h-6" /> Görünüm & Tasarım
            </h3>
            <div className="grid grid-cols-1 gap-4" role="group" aria-label="Tasarım Ayarları">
                <div className="space-y-2">
                    <label htmlFor="currentPreset" className="font-bold text-xs uppercase opacity-70">Paylaşım Boyutu</label>
                    <select
                        id="currentPreset"
                        name="currentPreset"
                        value={currentPreset}
                        onChange={handleChange}
                        className="brutal-input font-bold focus:ring-2 focus:ring-v-yellow focus:outline-none"
                        aria-label="Görsel Boyutu Seç"
                    >
                        {Object.entries(PRESETS).map(([id, p]) => (
                            <option key={id} value={id}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label htmlFor="template" className="font-bold text-xs uppercase opacity-70">Tasarım Şablonu</label>
                    <select
                        id="template"
                        name="template"
                        value={template || "template1"}
                        onChange={handleChange}
                        className="brutal-input font-bold focus:ring-2 focus:ring-v-yellow focus:outline-none"
                        aria-label="Şablon Seç"
                    >
                        <option value="template1">Görüş / Yorum</option>
                        <option value="template2">Hakem İstatistikleri</option>
                        <option value="template3">Saha Görevlileri</option>
                        <option value="template4">VAR / AVAR</option>
                        <option value="template5">Tartışmalı Pozisyonlar</option>
                    </select>
                </div>

                <div className="space-y-4 border-2 border-black p-4 rounded-brutal bg-v-gray/20">
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1">
                            <label htmlFor="pattern" className="font-bold text-xs uppercase">Arka Plan Deseni</label>
                            <select
                                id="pattern"
                                name="pattern"
                                value={pattern}
                                onChange={handleChange}
                                className="brutal-input text-xs font-bold w-full focus:ring-2 focus:ring-v-yellow focus:outline-none"
                                aria-label="Arka Plan Desenini Değiştir"
                            >
                                <option value="none">Düz (Krem Rengi)</option>
                                <option value="dots">Noktalı</option>
                                <option value="grid">Izgara</option>
                                <option value="noise">Noise</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        onClick={handleResetPhotos}
                        className="w-full bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-wider py-4 border-[3px] border-black shadow-brutal transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:bg-red-700"
                    >
                        TÜM FOTOĞRAFLARI SIFIRLA
                    </button>
                    <p className="text-[10px] text-center font-bold text-black/50 mt-2 uppercase italic leading-tight">Yüklenen görseller yavaşlığa veya kalite düşüşüne sebep oluyorsa buradan belleği temizleyebilirsiniz.</p>
                </div>
            </div>
        </div>
    );
};

export default AppearanceSection;
