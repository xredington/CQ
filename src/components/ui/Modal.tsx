"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // backdrop click
      }}
      className={`w-full rounded-card border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/60 ${
        wide ? "max-w-3xl" : "max-w-md"
      }`}
    >
      <div className="flex items-center justify-between border-b border-line-soft px-5 py-4">
        <h2 className="font-display text-lg">{title}</h2>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded p-1 text-ink/60 hover:bg-ink/5 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="px-5 py-4">{children}</div>
    </dialog>
  );
}
