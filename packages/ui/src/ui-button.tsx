import React from "react";
import "./styles.css";

export interface UiButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

export function UiButton({ variant = "primary", className = "", ...rest }: UiButtonProps) {
  const classes = ["ui-btn", `ui-btn--${variant}`, className].filter(Boolean).join(" ");
  return <button className={classes} {...rest} />;
}
