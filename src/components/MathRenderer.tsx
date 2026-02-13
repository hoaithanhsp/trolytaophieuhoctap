import { useEffect, useRef } from 'react';

declare global {
    interface Window {
        MathJax?: {
            typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
            startup?: { promise: Promise<void> };
        };
    }
}

interface Props {
    content: string;
    className?: string;
}

export default function MathRenderer({ content, className = '' }: Props) {
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (!ref.current || !content) return;

        // Set innerHTML with the text content
        ref.current.innerHTML = escapeHtml(content);

        // Typeset with MathJax if available
        const typeset = async () => {
            if (window.MathJax?.typesetPromise && ref.current) {
                try {
                    await window.MathJax.typesetPromise([ref.current]);
                } catch {
                    // MathJax not ready yet, ignore
                }
            }
        };

        // Wait for MathJax to be ready
        if (window.MathJax?.startup?.promise) {
            window.MathJax.startup.promise.then(typeset);
        } else {
            // Retry after a short delay
            const timer = setTimeout(typeset, 500);
            return () => clearTimeout(timer);
        }
    }, [content]);

    return (
        <span ref={ref} className={`math-content ${className}`}>
            {content}
        </span>
    );
}

function escapeHtml(text: string): string {
    // Preserve LaTeX delimiters but escape HTML
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
