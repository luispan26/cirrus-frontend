import type { CSSProperties } from 'react';

// The Protocol Standardization Guide ships as a fixed PDF in /public (built
// from cirrus-backend/docs/protocol-standardization-guide.md by
// scripts/build-standardization-guide-pdf.py). It is read-only for users.
export const STANDARDIZATION_GUIDE_URL = '/protocol-standardization-guide.pdf';

export function StandardizationGuideDownload({ className = 'btn-out', style }: { className?: string; style?: CSSProperties }) {
  return (
    <a
      className={className}
      style={{ textDecoration: 'none', display: 'inline-block', ...style }}
      href={STANDARDIZATION_GUIDE_URL}
      download="Cirrus Protocol Standardization Guide.pdf"
    >
      Download Standardization Guide (PDF)
    </a>
  );
}
