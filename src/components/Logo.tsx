import { BookOpenText } from 'lucide-react';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'brand-compact' : ''}`}>
      <span className="brand-mark"><BookOpenText size={compact ? 18 : 22} /></span>
      {!compact && <span><strong>Arc</strong>Binder</span>}
    </div>
  );
}
