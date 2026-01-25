import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';

interface LatexTextProps {
  children: string;
  className?: string;
}

// Component to render text with inline LaTeX
const LatexText: React.FC<LatexTextProps> = ({ children, className }) => {
  if (!children) return null;

  // Split text by LaTeX patterns
  // Match: $...$ for inline math, $$...$$ for block math
  const parts = children.split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          // Block math
          const math = part.slice(2, -2).trim();
          try {
            return <BlockMath key={index} math={math} />;
          } catch (e) {
            return <span key={index}>{part}</span>;
          }
        } else if (part.startsWith('$') && part.endsWith('$')) {
          // Inline math
          const math = part.slice(1, -1).trim();
          try {
            return <InlineMath key={index} math={math} />;
          } catch (e) {
            return <span key={index}>{part}</span>;
          }
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

export default LatexText;
