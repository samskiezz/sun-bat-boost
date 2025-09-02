interface EmptyStateProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="border rounded-2xl p-8 text-center bg-white/70">
      <div className="text-lg font-medium">{title}</div>
      {subtitle && <p className="text-sm mt-1 opacity-80">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}