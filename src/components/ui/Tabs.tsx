"use client";

export interface TabItem<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className = "",
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={`flex gap-1 overflow-x-auto border-b border-line-soft ${className}`}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={`-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm transition-colors ${
              active
                ? "border-accent text-ink"
                : "border-transparent text-ink/60 hover:text-ink"
            }`}
          >
            {item.label}
            {typeof item.count === "number" && (
              <span className="ml-1.5 font-mono text-xs text-ink/50">
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
