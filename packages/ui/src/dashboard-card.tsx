import React from "react";
import { Icon } from "./icon";
import "./styles.css";

/**
 * DashboardCard - A card component for displaying dashboard items
 * 
 * @example
 * ```tsx
 * <DashboardCard 
 *   title="Tasks" 
 *   value={42} 
 *   icon="assignment"
 *   trend={{ value: 5, positive: true }}
 * />
 * ```
 */
export interface DashboardCardProps {
  /** Card title */
  title: string;
  /** Main value to display */
  value: string | number;
  /** Optional icon name */
  icon?: string;
  /** Optional description/subtitle */
  description?: string;
  /** Optional trend indicator */
  trend?: {
    /** Trend value (e.g., "+5" or "-3") */
    value: string | number;
    /** Whether the trend is positive */
    positive: boolean;
  };
  /** Click handler */
  onClick?: () => void;
  /** Additional className */
  className?: string;
  /** Card content */
  children?: React.ReactNode;
}

export function DashboardCard({
  title,
  value,
  icon,
  description,
  trend,
  onClick,
  className = "",
  children,
}: DashboardCardProps) {
  const handleClick = onClick ? { onClick } : {};

  return (
    <div className={`ui-card ${onClick ? "ui-card--clickable" : ""} ${className}`} {...handleClick}>
      <div className="ui-card__header">
        {icon && <Icon name={icon} size={24} className="ui-card__icon" />}
        <span className="ui-card__title">{title}</span>
      </div>
      
      <div className="ui-card__body">
        <span className="ui-card__value">{value}</span>
        {description && <span className="ui-card__desc">{description}</span>}
      </div>

      {trend && (
        <div className={`ui-card__trend ${trend.positive ? "ui-card__trend--up" : "ui-card__trend--down"}`}>
          <Icon name={trend.positive ? "trending_up" : "trending_down"} size={16} />
          <span>{trend.value}</span>
        </div>
      )}

      {children}
    </div>
  );
}
