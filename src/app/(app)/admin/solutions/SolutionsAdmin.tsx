"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { SOLUTION_CATEGORIES, SOLUTION_CATEGORY_LABELS } from "@/lib/constants";
import type { Solution, SolutionCategory } from "@/lib/database.types";
import { deleteSolution, saveSolution } from "./actions";

const EMPTY = {
  title: "",
  vendor: "",
  category: "copilot" as SolutionCategory,
  summary: "",
  description: "",
  outcomes: "",
  logo_url: "",
  owner_name: "",
  owner_email: "",
  status: "draft" as "draft" | "published",
};

function Editor({
  initial,
  solutionId,
  onDone,
}: {
  initial: typeof EMPTY;
  solutionId?: string;
  onDone: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const set = (key: keyof typeof EMPTY, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async (status: "draft" | "published") => {
    setSaving(true);
    const result = await saveSolution({ ...form, status, id: solutionId });
    setSaving(false);
    if (result.error) return toast(result.error, "error");
    toast(status === "published" ? "Published" : "Draft saved");
    onDone();
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <Input label="Title" value={form.title} onChange={(e) => set("title", e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Vendor" value={form.vendor} onChange={(e) => set("vendor", e.target.value)} />
        <Select
          label="Category"
          value={form.category}
          onChange={(e) => set("category", e.target.value)}
        >
          {SOLUTION_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {SOLUTION_CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
      </div>
      <Textarea
        label="Card summary"
        rows={2}
        maxLength={160}
        hint={`${form.summary.length}/160`}
        value={form.summary}
        onChange={(e) => set("summary", e.target.value)}
      />
      <Textarea
        label="Description"
        rows={6}
        hint="Bold, lists and links supported"
        value={form.description}
        onChange={(e) => set("description", e.target.value)}
      />
      <Textarea
        label="Outcomes"
        rows={4}
        hint="One result per bullet — lead with the number"
        value={form.outcomes}
        onChange={(e) => set("outcomes", e.target.value)}
      />
      <Input
        label="Logo URL"
        value={form.logo_url}
        onChange={(e) => set("logo_url", e.target.value)}
        hint="Optional — upload to the media bucket and paste the URL"
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Owner name"
          value={form.owner_name}
          onChange={(e) => set("owner_name", e.target.value)}
        />
        <Input
          label="Owner email"
          type="email"
          value={form.owner_email}
          onChange={(e) => set("owner_email", e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={() => submit("draft")} loading={saving}>
          Save draft
        </Button>
        <Button onClick={() => submit("published")} loading={saving}>
          Publish
        </Button>
      </div>
    </div>
  );
}

export function SolutionsAdmin({ solutions }: { solutions: Solution[] }) {
  const [editing, setEditing] = useState<Solution | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Solution | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    const result = await deleteSolution(deleting.id);
    setBusy(false);
    setDeleting(null);
    if (result.error) return toast(result.error, "error");
    toast("Solution deleted");
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>Add solution</Button>
      </div>
      {solutions.length === 0 ? (
        <EmptyState
          title="No solutions yet"
          description="Add the first solution to open the catalogue."
          action={<Button onClick={() => setCreating(true)}>Add solution</Button>}
        />
      ) : (
        <Card className="divide-y divide-line-soft">
          {solutions.map((s) => (
            <div key={s.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.title}</p>
                <p className="truncate text-xs text-ink/50">
                  {s.vendor} · {SOLUTION_CATEGORY_LABELS[s.category]}
                </p>
              </div>
              <Badge tone={s.status === "published" ? "success" : "neutral"}>
                {s.status}
              </Badge>
              <div className="flex gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>
                  Edit
                </Button>
                <Button size="sm" variant="danger" onClick={() => setDeleting(s)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Modal
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? "Edit solution" : "Add solution"}
        wide
      >
        <Editor
          solutionId={editing?.id}
          initial={
            editing
              ? {
                  title: editing.title,
                  vendor: editing.vendor,
                  category: editing.category,
                  summary: editing.summary,
                  description: editing.description ?? "",
                  outcomes: editing.outcomes ?? "",
                  logo_url: editing.logo_url ?? "",
                  owner_name: editing.owner_name ?? "",
                  owner_email: editing.owner_email ?? "",
                  status: editing.status,
                }
              : EMPTY
          }
          onDone={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete solution"
      >
        <p className="text-sm text-ink/80">
          Delete &ldquo;{deleting?.title}&rdquo; and its captured interests?
          This can&apos;t be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete} loading={busy}>
            Delete solution
          </Button>
        </div>
      </Modal>
    </div>
  );
}
