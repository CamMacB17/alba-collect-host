import React from "react";

type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral";

type BadgeProps = {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
};

const variantClasses: Record<BadgeVariant, string> = {
  success: "badge-success",
  warning: "badge-warning",
  error: "badge-error",
  info: "badge-info",
  neutral: "badge-neutral",
};

export default function Badge({ variant = "neutral", children, className = "" }: BadgeProps) {
  return (
    <span className={`badge ${variantClasses[variant]} ${className}`.trim()}>
      {children}
    </span>
  );
}
