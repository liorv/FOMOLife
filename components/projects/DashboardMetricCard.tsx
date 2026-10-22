import React from "react";

export interface DashboardMetricCardProps {
  icon: string;
  label: string;
  value: string | number;
  accent?: string | undefined;
  onClick?: () => void;
  active?: boolean | undefined;
  clickable?: boolean | undefined;
}

export default function DashboardMetricCard({
  icon,
  label,
  value,
  accent,
  onClick,
  active,
  clickable,
}: DashboardMetricCardProps) {
  return (
    <div
      className={[
        "dashboard-card",
        accent ? `dashboard-card--${accent}` : "",
        clickable ? "dashboard-card--clickable" : "",
        active ? "dashboard-card--active" : "",
        active && accent ? `dashboard-card--${accent}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable && onClick
          ? (event: React.KeyboardEvent<HTMLDivElement>) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <span className="material-icons dashboard-card__icon">{icon}</span>
      <div className="dashboard-card__content">
        <span className="dashboard-card__value">{value}</span>
        {label ? <span className="dashboard-card__label">{label}</span> : null}
      </div>
    </div>
  );
}
