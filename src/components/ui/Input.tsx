import React from "react";

type InputProps = {
  error?: boolean;
  label?: string;
  id?: string;
  required?: boolean;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

export default function Input({
  error = false,
  label,
  id,
  required = false,
  className = "",
  ...props
}: InputProps) {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);
  const errorClass = error ? "border-[var(--alba-red)] focus:border-[var(--alba-red)]" : "";
  const roundedClass = "rounded-full";

  const input = (
    <input
      id={inputId}
      required={required}
      className={`w-full ${roundedClass} ${errorClass} ${className}`.trim()}
      {...props}
    />
  );

  if (label) {
    return (
      <div>
        <label htmlFor={inputId} className="block text-label mb-1.5">
          {label} {required && <span className="text-[var(--alba-red)]">*</span>}
        </label>
        {input}
      </div>
    );
  }

  return input;
}
