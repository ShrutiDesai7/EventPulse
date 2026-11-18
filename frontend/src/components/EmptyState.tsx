import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, actionTo }: EmptyStateProps) {
  return (
    <section className="empty-state">
      <div className="empty-icon"><Icon size={24} strokeWidth={1.8} /></div>
      <h3>{title}</h3>
      <p>{description}</p>
      {actionLabel && actionTo && <Link className="button button-secondary button-small" to={actionTo}>{actionLabel}<span aria-hidden="true">→</span></Link>}
    </section>
  );
}
