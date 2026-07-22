import { forwardRef, useId, type SelectHTMLAttributes } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ label, error, className = "", id, children, ...props }, ref) {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <div className={className}>
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm text-ink/80">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`h-10 w-full appearance-none rounded-md border bg-bg px-3 text-sm text-ink ${
            error ? "border-danger/60" : "border-line"
          }`}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }
);
