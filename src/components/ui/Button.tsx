import React from "react";

type ButtonVariant = "primary" | "secondary" | "success" | "danger" | "outline";

type ButtonProps = {
  variant?: ButtonVariant;
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const variantClasses: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  success: "btn-success",
  danger: "btn-danger",
  outline: "btn-secondary border-2",
};

export default function Button({
  variant = "primary",
  loading = false,
  loadingText,
  disabled = false,
  fullWidth = false,
  children,
  type = "button",
  onClick,
  className = "",
  ...props
}: ButtonProps) {
  const baseClasses = variantClasses[variant];
  const widthClass = fullWidth ? "w-full" : "";
  const pillClass = "rounded-full";
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${pillClass} ${widthClass} ${className}`.trim()}
      {...props}
    >
      {loading ? (loadingText || "Loading…") : children}
    </button>
  );
}
