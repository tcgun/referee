"use client";

import React from "react";
import { useStore } from "../store/useStore";
import AppearanceSection from "./editor/AppearanceSection";
import Template1Form from "./editor/Template1Form";
import Template2Form from "./editor/Template2Form";
import Template3Form from "./editor/Template3Form";
import Template4Form from "./editor/Template4Form";
import Template5Form from "./editor/Template5Form";
import BrandingSection from "./editor/BrandingSection";
import SponsorSection from "./editor/SponsorSection";
import TypographySection from "./editor/TypographySection";

const Editor: React.FC = () => {
    const { template, updateState } = useStore();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const target = e.target as HTMLInputElement;
        const { name, value, type } = target;
        const val = type === "checkbox" ? target.checked : value;
        updateState(name, val);
    };

    const renderTemplateForm = () => {
        switch (template) {
            case "template1":
                return <Template1Form handleChange={handleChange} />;
            case "template2":
                return <Template2Form handleChange={handleChange} />;
            case "template3":
                return <Template3Form handleChange={handleChange} />;
            case "template4":
                return <Template4Form handleChange={handleChange} />;
            case "template5":
                return <Template5Form />;
            default:
                return (
                    <div className="space-y-6">
                        <div className="bg-v-yellow/10 p-6 border-2 border-black rounded-brutal text-center space-y-2">
                            <p className="text-sm font-black uppercase text-black">ÖZEL FORM HAZIRLANIYOR</p>
                            <p className="text-[10px] font-bold uppercase text-black/50 italic">
                                Bu şablon için dile getirdiğiniz özel form yapısı yakında eklenecektir.
                            </p>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="w-full md:w-[480px] md:flex-none h-full overflow-y-auto p-6 space-y-8 bg-white border-r-brutal border-black min-w-0">
            {/* Görünüm & Tasarım Ayarları */}
            <AppearanceSection handleChange={handleChange} />

            {/* Yazı Boyutu Ayarı */}
            <TypographySection />

            {/* Şablona Özel İçerik Editörü */}
            <div className="space-y-4">
                <h3 className="text-xl font-black uppercase text-v-pink underline decoration-4">İçerik Editörü</h3>
                {renderTemplateForm()}
            </div>

            {/* Sosyal Medya & Marka Ayarları */}
            <div className="space-y-8 pb-24">
                <BrandingSection handleChange={handleChange} />
                <SponsorSection handleChange={handleChange} />
            </div>
        </div>
    );
};

export default Editor;
