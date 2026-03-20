import React from "react";
import { useStore } from "../../store/useStore";
import { PRESETS } from "../../types";
import { Globe } from "lucide-react";

interface BaseTemplateProps {
    domRef: React.RefObject<HTMLDivElement | null>;
    children: React.ReactNode;
    showLogo?: boolean;
    showBrandingBar?: boolean;
    showBrandingHeader?: boolean;
    overlayContent?: React.ReactNode;
    bgColor?: string;
}

const BaseTemplate: React.FC<BaseTemplateProps> = ({
    domRef,
    children,
    showLogo = true,
    showBrandingBar = true,
    showBrandingHeader = true,
    overlayContent,
    bgColor: propBgColor
}) => {
    const {
        currentPreset,
        theme,
        template,
        officials,
        pattern,
        handles,
        showBrandingBar: showStateBrandingBar,
        bgColor: storeBgColor
    } = useStore();

    const preset = PRESETS[currentPreset] || PRESETS["ig-square"];
    const isLandscape = preset.width > preset.height;

    // Tema Renkleri
    const THEMES: Record<string, any> = {
        varsayim: {
            bg: "#FDF6E3",
            darkBg: "#000000",
            text: "text-slate-800",
            vYellow: "#FFD700"
        },
    };

    const currentTheme = THEMES[theme] || THEMES.varsayim;

    // Template 2 check - uses referee photo as background instead of color pattern
    const isRefereeBg = template === "template2";

    return (
        <div
            ref={domRef}
            className={`relative flex flex-col p-0 overflow-hidden box-border font-sans transition-all duration-300 ${isRefereeBg ? 'bg-black' : ''}`}
            style={{
                width: preset.width,
                height: preset.height,
                backgroundColor: isRefereeBg ? undefined : (propBgColor || storeBgColor || currentTheme.bg),
            }}
            id="capture-area"
        >
            {/* BACKGROUND LAYER */}
            <div className="absolute inset-0 z-0 select-none pointer-events-none">
                {isRefereeBg ? (
                    <>
                        {officials.referee?.image ? (
                            <img
                                src={officials.referee.image}
                                alt="Referee"
                                className="w-full h-full object-cover opacity-90 grayscale-[0.3]"
                                style={{
                                    objectPosition: `${officials.referee.x ?? 50}% ${officials.referee.y ?? 50}%`,
                                    transformOrigin: `${officials.referee.x ?? 50}% ${officials.referee.y ?? 50}%`,
                                    transform: `scale(${officials.referee.scale ?? 1})`
                                }}
                            />
                        ) : (
                            <div className="w-full h-full bg-slate-900" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                    </>
                ) : (
                    <>
                        {pattern === "dots" && (
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                        )}
                        {pattern === "grid" && (
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                        )}
                        {pattern === "noise" && (
                            <div className="absolute inset-0 opacity-5 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                        )}
                    </>
                )}
                {/* Global Noise Overlay */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />
            </div>

            {/* LOGO (Right Top) */}
            {showLogo && showBrandingHeader && (
                <div className={`absolute ${isLandscape ? 'top-4 right-4' : 'top-6 right-6'} z-[60]`}>
                    <div className="bg-[#FFD700] text-black border-[3px] border-black shadow-[4px_4px_15px_rgba(255,0,150,0.4)] px-8 py-3">
                        <span className="text-4xl font-black tracking-tighter uppercase text-black leading-none select-none">
                            VARSAYIM
                        </span>
                    </div>
                </div>
            )}

            {/* MAIN CONTENT AREA */}
            <div className="relative z-10 flex-1 flex flex-col w-full h-full overflow-hidden">
                {children}
            </div>

            {/* OVERLAY CONTENT (Floating elements) */}
            {overlayContent && (
                <div className="absolute inset-0 z-20 pointer-events-none">
                    {overlayContent}
                </div>
            )}

            {/* BOTTOM BAR AREA */}
            <div className="relative z-50 flex flex-col items-center w-full">
                {/* Marka Çubuğu (Branding Bar) */}
                {showBrandingBar && showStateBrandingBar && (
                    <div className="w-full bg-black text-white py-4 px-8 border-t-brutal border-white/20 flex items-center justify-between">
                        {/* Web Sitesi (Sol) */}
                        <div className="flex items-center gap-2">
                            <Globe size={24} className="text-v-yellow" />
                            <span className="font-bold text-xl tracking-tight">{handles.website}</span>
                        </div>

                        {/* Sosyal Medya Kanalları (Orta/Sağ) */}
                        <div className="flex items-center gap-5">
                            {[
                                { key: 'instagram', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg> },
                                { key: 'tiktok', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" /></svg> },
                                { key: 'twitter', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932zm-1.292 19.49h2.039L6.486 3.24H4.298l13.311 17.403z" /></svg> },
                                { key: 'facebook', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg> },
                                { key: 'youtube', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg> }
                            ].map((handle) => {
                                const value = (handles as any)[handle.key];
                                if (!value) return null;
                                return (
                                    <div key={handle.key} className="flex items-center gap-2 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all">
                                        <div className="bg-white/10 p-1.5 rounded">
                                            {handle.icon}
                                        </div>
                                        <span className="font-bold text-lg tracking-tight">{value}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BaseTemplate;
