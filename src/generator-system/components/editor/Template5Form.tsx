import React from 'react';
import { useStore } from '../../store/useStore';
import { Plus, Trash2, ClipboardPaste } from 'lucide-react';

const Template5Form = () => {
    const { 
        matchMistakes,
        showNextPageIndicator,
        setState
    } = useStore();

    const handleMistakeChange = (index: number, field: string, value: string) => {
        const newMistakes = [...matchMistakes];
        newMistakes[index] = { ...newMistakes[index], [field]: value };
        setState({ matchMistakes: newMistakes });
    };

    const [pasteText, setPasteText] = React.useState('');

    const handlePaste = (rawText: string) => {
        if (!rawText.trim()) return;

        const blocks = rawText.split(/(?=^inc\d+\b|\binc\d+\b)/im).filter(b => /^inc\d+\b/i.test(b.trim()));
        
        if (blocks.length === 0) {
            alert("Uygun formatta veri bulunamadı. Lütfen tabloyu doğru kopyaladığınızdan emin olun.");
            return;
        }

        const newMistakes = blocks.map(block => {
            const parts = block.split('\t').map(s => s.trim());
            
            const inc = parts[0] || '';
            const minute = parts[1] || '';
            const title = parts[2] || '';
            
            let cardPlayer = '';
            let refDecision = '';
            let finalDecision = '';
            let varIntervention = '';

            if (parts.length >= 8) {
                varIntervention = parts[3].replace(/[\n\r"]/g, ' ').trim();
                if (varIntervention === '-') varIntervention = '';
                
                const eksik = parts[4].replace(/[\n\r"]/g, ' ').replace(/-$/, '').trim();
                const hatali = parts[5].replace(/[\n\r"]/g, ' ').replace(/-$/, '').trim();
                if (eksik && eksik !== '-') cardPlayer = `EKSİK: ${eksik}`;
                if (hatali && hatali !== '-') {
                    cardPlayer = cardPlayer ? `${cardPlayer} | HATALI: ${hatali}` : `HATALI: ${hatali}`;
                }
                refDecision = parts[6].replace(/[\n\r"]/g, ' ').trim();
                finalDecision = parts[7].replace(/[\n\r"]/g, ' ').trim();
            } else if (parts.length === 7) {
                const eksik = parts[3].replace(/[\n\r"]/g, ' ').replace(/-$/, '').trim();
                const hatali = parts[4].replace(/[\n\r"]/g, ' ').replace(/-$/, '').trim();
                if (eksik && eksik !== '-') cardPlayer = `EKSİK: ${eksik}`;
                if (hatali && hatali !== '-') {
                    cardPlayer = cardPlayer ? `${cardPlayer} | HATALI: ${hatali}` : `HATALI: ${hatali}`;
                }
                refDecision = parts[5].replace(/[\n\r"]/g, ' ').trim();
                finalDecision = parts[6].replace(/[\n\r"]/g, ' ').trim();
            } else {
                const fallbackCard = (parts[3] || '').replace(/[\n\r"]/g, ' ').replace(/-/g, '').trim();
                if (fallbackCard) cardPlayer = `KART: ${fallbackCard}`;
                refDecision = parts[4] || ''; 
                finalDecision = parts[5] || ''; 
            }

            let icon: "check" | "cross" | "question" = "question";
            const netUpper = finalDecision.toUpperCase();
            if (netUpper.includes('DOĞRU')) icon = 'check';
            else if (netUpper.includes('YANLIŞ') || netUpper.includes('GÖRMELİYDİ') || netUpper.includes('GEREK YOK') || netUpper.includes('SARI KART') || netUpper.includes('KIRMIZI KART')) {
                if (!netUpper.includes('DOĞRU')) icon = 'cross';
            }

            return {
                id: Math.random().toString(36).substr(2, 9),
                inc,
                minute,
                title,
                description1: '',
                description2: '',
                description3: '',
                refDecision,
                finalDecision,
                cardPlayer,
                varIntervention,
                icon
            };
        });

        setState({ matchMistakes: newMistakes.slice(0, 4) });
    };

    const addMistake = () => {
        setState({
            matchMistakes: [
                ...matchMistakes,
                {
                    id: Math.random().toString(36).substr(2, 9),
                    minute: "0'",
                    title: "YENİ POZİSYON",
                    description1: "",
                    description2: "",
                    description3: "",
                    icon: "question"
                }
            ]
        });
    };

    const removeMistake = (index: number) => {
        const newMistakes = [...matchMistakes];
        newMistakes.splice(index, 1);
        setState({ matchMistakes: newMistakes });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Pozisyon Karar Özeti</h3>
                <button
                    onClick={addMistake}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#FFD700] text-black font-bold uppercase text-sm hover:bg-[#FFD700]/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Pozisyon Ekle
                </button>
            </div>

            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg space-y-3">
                <label className="block text-sm font-bold text-[#FFD700] uppercase">Tablodan Veri Yapıştır</label>
                <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Siteden kopyaladığınız tabloyu buraya yapıştırın (INC Dk Açıklama...)"
                    className="w-full h-24 bg-black border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-[#FFD700] resize-y"
                />
                <button
                    onClick={() => {
                        handlePaste(pasteText);
                        setPasteText('');
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded transition-colors"
                >
                    <ClipboardPaste className="w-4 h-4" />
                    Verileri Aktar (Maks. 4)
                </button>
            </div>

            <div className="flex items-center gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
                <input
                    type="checkbox"
                    id="showNextPageIndicator"
                    checked={showNextPageIndicator}
                    onChange={(e) => setState({ showNextPageIndicator: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-[#FFD700] focus:ring-[#FFD700] focus:ring-offset-zinc-900"
                />
                <label htmlFor="showNextPageIndicator" className="text-sm font-bold text-zinc-300 select-none cursor-pointer">
                    En Alt Kısımda "Devamı Diğer Sayfada" İbaresini Göster
                </label>
            </div>

            <div className="space-y-4">
                {matchMistakes.map((mistake, index) => (
                    <div key={mistake.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[#FFD700] font-bold">Pozisyon {index + 1}</span>
                            <button
                                onClick={() => removeMistake(index)}
                                className="text-red-500 hover:text-red-400 p-1 transition-colors"
                                title="Sil"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-4">
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Dakika</label>
                                <input
                                    type="text"
                                    value={mistake.minute}
                                    onChange={(e) => handleMistakeChange(index, 'minute', e.target.value)}
                                    className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-white focus:outline-none focus:border-[#FFD700]"
                                    placeholder="Örn: 15'"
                                />
                            </div>
                            <div className="col-span-3">
                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Pozisyon Başlığı</label>
                                <input
                                    type="text"
                                    value={mistake.title}
                                    onChange={(e) => handleMistakeChange(index, 'title', e.target.value)}
                                    className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-white focus:outline-none focus:border-[#FFD700]"
                                    placeholder="Örn: PENALTI BEKLENTİSİ"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-xs font-bold text-zinc-400 uppercase">Karar İkonu (Dakikanın Solunda)</label>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name={`icon-${index}`}
                                        value="none"
                                        checked={!mistake.icon || mistake.icon === 'none'}
                                        onChange={(e) => handleMistakeChange(index, 'icon', e.target.value)}
                                        className="text-[#FFD700] focus:ring-[#FFD700] bg-black border-zinc-700"
                                    />
                                    <span className="text-sm font-bold text-zinc-300">Yok</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name={`icon-${index}`}
                                        value="check"
                                        checked={mistake.icon === 'check'}
                                        onChange={(e) => handleMistakeChange(index, 'icon', e.target.value)}
                                        className="text-[#FFD700] focus:ring-[#FFD700] bg-black border-zinc-700"
                                    />
                                    <span className="text-sm font-bold text-green-500">Doğru (✓)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name={`icon-${index}`}
                                        value="cross"
                                        checked={mistake.icon === 'cross'}
                                        onChange={(e) => handleMistakeChange(index, 'icon', e.target.value)}
                                        className="text-[#FFD700] focus:ring-[#FFD700] bg-black border-zinc-700"
                                    />
                                    <span className="text-sm font-bold text-red-500">Yanlış (✕)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name={`icon-${index}`}
                                        value="question"
                                        checked={mistake.icon === 'question'}
                                        onChange={(e) => handleMistakeChange(index, 'icon', e.target.value)}
                                        className="text-[#FFD700] focus:ring-[#FFD700] bg-black border-zinc-700"
                                    />
                                    <span className="text-sm font-bold text-blue-400">Kararsız (?)</span>
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-zinc-400 uppercase">Hakem Kararı</label>
                                <input
                                    type="text"
                                    value={mistake.refDecision || ''}
                                    onChange={(e) => handleMistakeChange(index, 'refDecision', e.target.value)}
                                    className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFD700]"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-zinc-400 uppercase">Net Karar</label>
                                <input
                                    type="text"
                                    value={mistake.finalDecision || ''}
                                    onChange={(e) => handleMistakeChange(index, 'finalDecision', e.target.value)}
                                    className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFD700]"
                                />
                            </div>
                        </div>
                        <div className="space-y-1 mt-4">
                            <label className="block text-xs font-bold text-zinc-400 uppercase">VAR Müdahalesi (Opsiyonel)</label>
                            <input
                                type="text"
                                value={mistake.varIntervention || ''}
                                onChange={(e) => handleMistakeChange(index, 'varIntervention', e.target.value)}
                                className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFD700]"
                                placeholder="Örn: Penaltı"
                            />
                        </div>
                        <div className="space-y-2 mt-4">
                            <label className="block text-xs font-bold text-zinc-400 uppercase">Hatalı/Eksik Kart Oyuncusu (Opsiyonel)</label>
                            <div className="flex gap-2 mb-2">
                                <button
                                    onClick={() => {
                                        const clean = (mistake.cardPlayer || '').replace(/^(HATALI:\s*|EKSİK:\s*|KART:\s*|HATALI\s*|EKSİK\s*|KART\s*)/i, '').trim();
                                        handleMistakeChange(index, 'cardPlayer', `EKSİK: ${clean}`);
                                    }}
                                    className={`px-2 py-1 text-[10px] font-bold rounded border ${/EKSİK/i.test(mistake.cardPlayer || '') ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}
                                >
                                    EKSİK KART
                                </button>
                                <button
                                    onClick={() => {
                                        const clean = (mistake.cardPlayer || '').replace(/^(HATALI:\s*|EKSİK:\s*|KART:\s*|HATALI\s*|EKSİK\s*|KART\s*)/i, '').trim();
                                        handleMistakeChange(index, 'cardPlayer', `HATALI: ${clean}`);
                                    }}
                                    className={`px-2 py-1 text-[10px] font-bold rounded border ${/HATALI/i.test(mistake.cardPlayer || '') ? 'bg-orange-500/20 border-orange-500 text-orange-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}
                                >
                                    HATALI KART
                                </button>
                                <button
                                    onClick={() => {
                                        const clean = (mistake.cardPlayer || '').replace(/^(HATALI:\s*|EKSİK:\s*|KART:\s*|HATALI\s*|EKSİK\s*|KART\s*)/i, '').trim();
                                        handleMistakeChange(index, 'cardPlayer', clean);
                                    }}
                                    className="px-2 py-1 text-[10px] font-bold rounded border bg-zinc-800 border-zinc-700 text-zinc-400"
                                >
                                    TEMİZLE
                                </button>
                            </div>
                            <input
                                type="text"
                                value={mistake.cardPlayer || ''}
                                onChange={(e) => handleMistakeChange(index, 'cardPlayer', e.target.value)}
                                className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFD700]"
                                placeholder="Örn: CHRISTOPHER LUNGOYI"
                            />
                        </div>

                        <div className="space-y-2 mt-4">
                            <label className="block text-xs font-bold text-zinc-400 uppercase">Ek Açıklamalar (Maks 2 satır)</label>
                            <input
                                type="text"
                                value={mistake.description1}
                                onChange={(e) => handleMistakeChange(index, 'description1', e.target.value)}
                                className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFD700]"
                                placeholder="1. Satır (İsteğe bağlı)"
                            />
                            <input
                                type="text"
                                value={mistake.description2}
                                onChange={(e) => handleMistakeChange(index, 'description2', e.target.value)}
                                className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFD700]"
                                placeholder="2. Satır (İsteğe bağlı)"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Template5Form;
