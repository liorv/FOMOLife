import React from "react";
import "./styles.css";

/**
 * Icon - Material Icons wrapper component
 * 
 * Uses Google Material Icons font. Make sure your app includes the font:
 * <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
 * 
 * @example
 * ```tsx
 * <Icon name="check" />
 * <Icon name="warning" size="small" />
 * <Icon name="loading" spin />
 * ```
 */
export interface IconProps {
  /** Icon name from Material Icons */
  name: string;
  /** Icon size: 'small' | 'medium' | 'large' or custom size */
  size?: "small" | "medium" | "large" | number;
  /** Whether to show a spinning animation */
  spin?: boolean;
  /** Additional CSS class */
  className?: string;
  /** aria-label for accessibility */
  "aria-label"?: string;
}

const sizeMap = {
  small: 18,
  medium: 24,
  large: 36,
};

export function Icon({ 
  name, 
  size = "medium", 
  spin = false, 
  className = "",
  ...props 
}: IconProps) {
  const fontSize = typeof size === "number" ? size : sizeMap[size];
  
  const classes = [
    "material-icons",
    spin && "ui-icon--spin",
    className,
  ].filter(Boolean).join(" ");

  return (
    <span 
      className={classes} 
      style={{ fontSize }}
      aria-hidden={!props["aria-label"]}
      {...props}
    >
      {name}
    </span>
  );
}
