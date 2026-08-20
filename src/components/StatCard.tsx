import { Icon } from "./Icon";

export function StatCard({
  label,
  value,
  hint,
  iconBg,
  iconColor,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  iconBg: string;
  iconColor: string;
  icon: string;
}) {
  return (
    <div className="glass-card flex items-center justify-between rounded-xl p-5">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-on-surface-variant">{label}</p>
        <p className="mt-1 font-heading text-3xl font-bold tracking-tight text-on-surface">
          {value}
        </p>
        {hint && <p className="mt-0.5 text-xs text-on-surface-variant/80">{hint}</p>}
      </div>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
        <Icon name={icon} className="text-2xl" />
      </div>
    </div>
  );
}
