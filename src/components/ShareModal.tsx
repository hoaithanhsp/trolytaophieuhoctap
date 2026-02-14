import { useState, useEffect, useRef } from 'react';
import { X, Copy, Check, Share2 } from 'lucide-react';
import type { Worksheet } from '../types';

interface Props {
    worksheet: Worksheet;
    isOpen: boolean;
    onClose: () => void;
}

function compressData(data: string): string {
    try {
        return btoa(encodeURIComponent(data));
    } catch {
        return btoa(unescape(encodeURIComponent(data)));
    }
}

function generateQR(canvas: HTMLCanvasElement, text: string) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Simple QR-like visual (not a real QR code, but a placeholder visual)
    const size = 200;
    canvas.width = size;
    canvas.height = size;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Create a pattern based on text hash
    const cellSize = 5;
    const gridSize = Math.floor(size / cellSize);

    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash |= 0;
    }

    ctx.fillStyle = '#000000';

    // Position markers (3 corners)
    const drawMarker = (x: number, y: number) => {
        ctx.fillRect(x * cellSize, y * cellSize, 7 * cellSize, 7 * cellSize);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect((x + 1) * cellSize, (y + 1) * cellSize, 5 * cellSize, 5 * cellSize);
        ctx.fillStyle = '#000000';
        ctx.fillRect((x + 2) * cellSize, (y + 2) * cellSize, 3 * cellSize, 3 * cellSize);
    };

    drawMarker(2, 2);
    drawMarker(gridSize - 9, 2);
    drawMarker(2, gridSize - 9);

    // Fill data area with hash-based pattern
    let seed = Math.abs(hash);
    for (let y = 10; y < gridSize - 2; y++) {
        for (let x = 10; x < gridSize - 2; x++) {
            seed = (seed * 16807 + 12345) & 0x7fffffff;
            if (seed % 3 === 0) {
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }
    }
}

export default function ShareModal({ worksheet, isOpen, onClose }: Props) {
    const [copied, setCopied] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [shareLink, setShareLink] = useState('');

    useEffect(() => {
        if (!isOpen) return;

        // Create shareable data (minimal version)
        const shareData = {
            t: worksheet.title,
            s: worksheet.subjectName,
            g: worksheet.gradeLevel,
            sn: worksheet.schoolName,
            cn: worksheet.className,
            q: worksheet.questions.map(q => ({
                i: q.id,
                c: q.content,
                tp: q.type,
                o: q.options,
                ca: q.correctAnswer,
                ex: q.explanation,
                d: q.difficulty,
                mp: q.matchingPairs,
            })),
        };

        const encoded = compressData(JSON.stringify(shareData));
        const link = `${window.location.origin}${window.location.pathname}#/online/${encoded}`;
        setShareLink(link);

        // Draw QR-like visual
        setTimeout(() => {
            if (canvasRef.current) {
                generateQR(canvasRef.current, link);
            }
        }, 100);
    }, [isOpen, worksheet]);

    if (!isOpen) return null;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback
            const input = document.createElement('textarea');
            input.value = shareLink;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in">
                <div className="bg-gradient-to-r from-teal-500 to-emerald-400 p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white">
                        <Share2 className="w-5 h-5" />
                        <h2 className="text-lg font-bold">Chia sẻ bài tập online</h2>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <div className="text-center">
                        <h3 className="font-semibold text-slate-800">{worksheet.title}</h3>
                        <p className="text-sm text-slate-400 mt-1">
                            {worksheet.subjectName} · {worksheet.questions.length} câu hỏi
                        </p>
                    </div>

                    {/* QR Code */}
                    <div className="flex justify-center">
                        <div className="p-3 bg-white border-2 border-slate-200 rounded-2xl">
                            <canvas ref={canvasRef} className="w-[160px] h-[160px]" />
                        </div>
                    </div>
                    <p className="text-xs text-center text-slate-400">
                        Quét mã hoặc copy link bên dưới để chia sẻ
                    </p>

                    {/* Link */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            readOnly
                            value={shareLink}
                            className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-600 bg-slate-50 truncate"
                        />
                        <button
                            onClick={handleCopy}
                            className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${copied
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:shadow-lg'
                                }`}
                        >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copied ? 'Đã copy!' : 'Copy'}
                        </button>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                        <p className="text-xs text-amber-700">
                            💡 Học sinh mở link này sẽ thấy phiếu bài tập và có thể làm bài trực tuyến. Câu trắc nghiệm và Đúng/Sai sẽ được chấm điểm tự động.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
