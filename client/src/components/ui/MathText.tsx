import { useMemo, memo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * MathText — renders text with inline LaTeX math via KaTeX.
 *
 * Supports:
 *   - Inline math: $...$
 *   - Display math: $$...$$
 *   - Plain text (no math) passes through unchanged
 *
 * Usage:
 *   <MathText text="The magnitude is $\sqrt{x^2+y^2}$" />
 *   <MathText text="Simple text with no math" />
 */

interface MathTextProps {
  text: string;
  className?: string;
  as?: 'span' | 'p' | 'div';
}

const MATH_REGEX = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

/**
 * Auto-wrap bare subscript patterns (e.g. I_cm, v_t, k_eff, δ_m, ρ_block)
 * in $...$ so KaTeX can render them. Only operates on plain-text segments
 * outside existing $...$ / $$...$$ blocks.
 */
function preprocessMathTokens(text: string): string {
  // Split by existing math delimiters, preserving them
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/);
  return parts
    .map((part, i) => {
      if (i % 2 !== 0) return part; // already a math block — leave it alone

      let p = part;

      // Convert Unicode combining right arrow above (U+20D7) to \vec{}
      // e.g. i⃗ → $\vec{i}$, aj⃗ → a$\vec{j}$
      p = p.replace(
        /([A-Za-z\u0391-\u03A9\u03B1-\u03C9])\u20D7/g,
        (_, letter) => `$\\vec{${letter}}$`,
      );

      // Match: letter(s) followed by _word/number suffix(es) — subscript auto-wrap
      // e.g. I_cm, v_top, k_eff, W_net, m_H, ρ_block, s_n, δ_m
      p = p.replace(
        /(?<![A-Za-z0-9_])([A-Za-z\u0391-\u03A9\u03B1-\u03C9][A-Za-z0-9\u00B2\u00B3\u00B9\u2070-\u2079]*)(_[A-Za-z][A-Za-z0-9]*)(?![A-Za-z0-9_])/g,
        (match) => `$${match}$`,
      );

      return p;
    })
    .join('');
}

function hasMath(text: string): boolean {
  return /\$/.test(text);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


const MathText = memo(function MathText({ text, className = '', as: Tag = 'span' }: MathTextProps) {
  const { processed, html } = useMemo(() => {
    if (!text) return { processed: '', html: '' };
    const processed = preprocessMathTokens(text);
    if (!hasMath(processed)) return { processed, html: escapeHtml(processed) };
    return { processed, html: renderWithEscaping(processed) };
  }, [text]);

  if (!text) return null;

  if (!hasMath(processed)) {
    return <Tag className={className}>{processed}</Tag>;
  }

  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
});

/**
 * Process text: escape HTML in non-math parts, render math with KaTeX.
 */
function renderWithEscaping(text: string): string {
  const segments: string[] = [];
  let lastIdx = 0;

  // Reset regex state
  const regex = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Add escaped text before this match
    if (match.index > lastIdx) {
      segments.push(escapeHtml(text.slice(lastIdx, match.index)));
    }

    const display = match[1];
    const inline = match[2];
    const tex = display || inline;
    const isDisplay = !!display;

    try {
      segments.push(
        katex.renderToString(tex.trim(), {
          displayMode: isDisplay,
          throwOnError: false,
          trust: false,
          strict: false,
        })
      );
    } catch {
      segments.push(escapeHtml(match[0]));
    }

    lastIdx = regex.lastIndex;
  }

  // Add remaining text
  if (lastIdx < text.length) {
    segments.push(escapeHtml(text.slice(lastIdx)));
  }

  return segments.join('');
}

export default MathText;
