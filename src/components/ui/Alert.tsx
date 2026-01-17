import React from "react";

type AlertVariant = "success" | "error" | "info";

type AlertProps = {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

const variantClasses: Record<AlertVariant, string> = {
  success: "alert-success",
  error: "alert-error",
  info: "alert-info",
};

export default function Alert({ variant = "info", title, children, className = "" }: AlertProps) {
  return (
    <div className={`alert ${variantClasses[variant]} ${className}`.trim()}>
      {title && (
        <h2 className="text-base font-semibold mb-1" style={{ 
          color: variant === "success" ? "var(--alba-green)" : 
                 variant === "error" ? "var(--alba-red)" : 
                 "var(--alba-text)" 
        }}>
          {title}
        </h2>
      )}
      <div className="text-sm">{children}</div>
    </div>
  );
}
