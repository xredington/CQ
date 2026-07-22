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
import { Markdown } from "@/components/Markdown";
import type { Member, Spotlight } from "@/lib/database.types";
import { deleteSpotlight, saveSpotlight } from "./actions";

type MemberOption = Pick<Member, "id" | "full_name" | "company">;
type SpotlightRow = Spotlight & {
  member: { full_name: string; company: string } | null;
};

const EMPTY = {
  member_id: "",
  headline: "",
  story_md: "",
  metric_label: "",
  metric_before: "",
  metric_after: "",
  hero_image_url: "",
};

function Editor({
  initial,
  spotlightId,
  members,
  onDone,
}: {
  initial: typeof EMPTY;
  spotlightId?: string;
  members: MemberOption[];
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
    const result = await saveSpotlight({ ...form, status, id: spotlightId });
    setSaving(false);
    if (result.error) return toast(result.error, "error");
    toast(status === "published" ? "Published" : "Draft saved");
    onDone();
    router.refresh();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Select
          label="Member"
          value={form.member_id}
          onChange={(e) => set("member_id", e.target.value)}
        >
          <option value="">Pick a member</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name} — {m.company}
            </option>
          ))}
        </Select>
        <Input
          label="Headline"
          maxLength={120}
          hint={`${form.headline.length}/120`}
          value={form.headline}
          onChange={(e) => set("headline", e.target.value)}
        />
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Metric"
            placeholder="Onboarding time"
            value={form.metric_label}
            onChange={(e) => set("metric_label", e.target.value)}
          />
          <Input
            label="Before"
            placeholder="30 days"
            value={form.metric_before}
            onChange={(e) => set("metric_before", e.target.value)}
          />
          <Input
            label="After"
            placeholder="3 days"
            value={form.metric_after}
            onChange={(e) => set("metric_after", e.target.value)}
          />
        </div>
        <Textarea
          label="Story"
          rows={12}
          hint="Bold, lists and links supported"
          value={form.story_md}
          onChange={(e) => set("story_md", e.target.value)}
        />
        <Input
          label="Hero image URL"
          value={form.hero_image_url}
          onChange={(e) => set("hero_image_url", e.target.value)}
          hint="Optional — upload to the media bucket and paste the URL"
        />
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

      {/* Live preview matching the public page */}
      <div className="rounded-card border border-line-soft bg-bg p-5">
        <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-accent">
          <span className="hex-marker" aria-hidden /> Preview
        </p>
        <h2 className="font-display text-2xl leading-tight">
          {form.headline || "Headline lands here"}
        </h2>
        <Card className="my-5 border-accent/20 px-4 py-5 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-ink/50">
            {form.metric_label || "Metric"}
          </p>
          <p className="mt-2 font-mono text-2xl">
            <span className="text-ink/50 line-through decoration-danger/60">
              {form.metric_before || "before"}
            </span>{" "}
            <span aria-hidden>→</span>{" "}
            <span className="text-accent">{form.metric_after || "after"}</span>
          </p>
        </Card>
        {form.story_md ? (
          <Markdown source={form.story_md} className="text-sm" />
        ) : (
          <p className="text-sm text-ink/40">The story renders here as you type.</p>
        )}
      </div>
    </div>
  );
}

export function SpotlightsAdmin({
  spotlights,
  members,
}: {
  spotlights: SpotlightRow[];
  members: MemberOption[];
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SpotlightRow | null>(null);
  const [deleting, setDeleting] = useState<SpotlightRow | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    const result = await deleteSpotlight(deleting.id);
    setBusy(false);
    setDeleting(null);
    if (result.error) return toast(result.error, "error");
    toast("Spotlight deleted");
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>Add spotlight</Button>
      </div>
      {spotlights.length === 0 ? (
        <EmptyState
          title="No spotlights yet"
          description="Feature a member's win — pick the story with the strongest number."
          action={<Button onClick={() => setCreating(true)}>Add spotlight</Button>}
        />
      ) : (
        <Card className="divide-y divide-line-soft">
          {spotlights.map((s) => (
            <div key={s.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.headline}</p>
                <p className="truncate text-xs text-ink/50">
                  {s.member?.full_name} · {s.metric_label}: {s.metric_before} →{" "}
                  {s.metric_after}
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
        title={editing ? "Edit spotlight" : "Add spotlight"}
        wide
      >
        <Editor
          spotlightId={editing?.id}
          members={members}
          initial={
            editing
              ? {
                  member_id: editing.member_id,
                  headline: editing.headline,
                  story_md: editing.story_md,
                  metric_label: editing.metric_label,
                  metric_before: editing.metric_before,
                  metric_after: editing.metric_after,
                  hero_image_url: editing.hero_image_url ?? "",
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
        title="Delete spotlight"
      >
        <p className="text-sm text-ink/80">
          Delete &ldquo;{deleting?.headline}&rdquo;? This can&apos;t be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete} loading={busy}>
            Delete spotlight
          </Button>
        </div>
      </Modal>
    </div>
  );
}
