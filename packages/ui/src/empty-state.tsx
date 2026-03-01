import React from "react";
import { Icon } from "./icon";
import "./styles.css";

/**
 * EmptyState - Displayed when there's no content
 * 
 * @example
 * ```tsx
 * <EmptyState 
 *   icon="inbox" 
 *   title="No items" 
 *   description="Get started by adding your first item" 
 * />
 * ```
 */
export interface EmptyStateProps {
  /** Icon name */
  icon?: string;
  /** Main title */
  title: string;
  /** Optional description */
  description?: string;
  /** Optional action button */
  action?: React.ReactNode;
  /** Additional className */
  className?: string;
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action,
  className = "" 
}: EmptyStateProps) {
  return (
    <div className={`ui-empty ${className}`}>
      {icon && <Icon name={icon} size={48} className="ui-empty__icon" />}
      <p className="ui-empty__title">{title}</p>
      {description && <p className="ui-empty__desc">{description}</p>}
      {action && <div className="ui-empty__action">{action}</div>}
    </div>
  );
}

/**
 * LoadingSpinner - Displayed while content is loading
 * 
 * @example
 * ```tsx
 * <LoadingSpinner message="Loading items..." />
 * ```
 */
export interface LoadingSpinnerProps {
  /** Optional message */
  message?: string;
  /** Size: 'small' | 'medium' | 'large' */
  size?: "small" | "medium" | "large";
  /** Additional className */
  className?: string;
}

export function LoadingSpinner({ 
  message, 
  size = "medium",
  className = "" 
}: LoadingSpinnerProps) {
  return (
    <div className={`ui-spinner ui-spinner--${size} ${className}`}>
      <Icon name="sync" spin size={size === "small" ? 18 : size === "large" ? 48 : 24} />
      {message && <p className="ui-spinner__msg">{message}</p>}
    </div>
  );
}

/**
 * ErrorMessage - Displayed when an error occurs
 * 
 * @example
 * ```tsx
 * <ErrorMessage 
 *   message="Failed to load data" 
 *   onRetry={() => refetch()} 
 * />
 * ```
 */
export interface ErrorMessageProps {
  /** Error message */
  message: string;
  /** Optional retry handler */
  onRetry?: () => void;
  /** Additional className */
  className?: string;
}

export function ErrorMessage({ 
  message, 
  onRetry,
  className = "" 
}: ErrorMessageProps) {
  return (
    <div className={`ui-error ${className}`}>
      <Icon name="error_outline" size={32} className="ui-error__icon" />
      <p className="ui-error__msg">{message}</p>
      {onRetry && (
        <button className="ui-btn ui-error__retry" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}
