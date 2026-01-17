import React from "react";

type CardVariant = "default" | "gradient";

type CardProps = {
  variant?: CardVariant;
  children: React.ReactNode;
  className?: string;
};

export default function Card({ variant = "default", children, className = "" }: CardProps) {
  const baseClasses = "card";
  const gradientClasses = variant === "gradient" 
    ? "bg-gradient-to-br from-[var(--alba-card-bg)] via-[var(--alba-card-bg)] to-[#2a2a2f]" 
    : "";

  return (
    <div className={`${baseClasses} ${gradientClasses} ${className}`.trim()}>
      {children}
    </div>
  );
}
