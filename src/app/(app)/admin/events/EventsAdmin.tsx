"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { formatEventDate } from "@/lib/dates";
import type { CommunityEvent, EventStatus, Member } from "@/lib/database.types";
import { deleteEvent, saveEvent, setAttendance } from "./actions";

type MemberOption = Pick<Member, "id" | "full_name" | "company">;

const EMPTY = {
  name: "",
  city: "",
  country: "",
  event_date: "",
  timezone: "Asia/Dubai",
  description: "",
  cover_image_url: "",
  status: "upcoming" as EventStatus,
};

function DetailsForm({
  initial,
  eventId,
  onDone,
}: {
  initial: typeof EMPTY;
  eventId?: string;
  onDone: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const set = (key: keyof typeof EMPTY, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    setSaving(true);
    const result = await saveEvent({ ...form, id: eventId });
    setSaving(false);
    if (result.error) return toast(result.error, "error");
    toast(eventId ? "Changes saved" : "Event added");
    onDone();
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <Input label="Name" value={form.name} onChange={(e) => set("name", e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="City" value={form.city} onChange={(e) => set("city", e.target.value)} />
        <Input
          label="Country"
          value={form.country}
          onChange={(e) => set("country", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Date"
          type="date"
          value={form.event_date}
          onChange={(e) => set("event_date", e.target.value)}
        />
        <Input
          label="Timezone (IANA)"
          value={form.timezone}
          onChange={(e) => set("timezone", e.target.value)}
          hint="e.g. Asia/Dubai, Africa/Nairobi"
        />
      </div>
      <Textarea
        label="Description"
        rows={3}
        value={form.description}
        onChange={(e) => set("description", e.target.value)}
      />
      <Input
        label="Cover image URL"
        value={form.cover_image_url}
        onChange={(e) => set("cover_image_url", e.target.value)}
        hint="Optional — upload to the media bucket and paste the URL"
      />
      <Select
        label="Status"
        value={form.status}
        onChange={(e) => set("status", e.target.value)}
      >
        <option value="upcoming">Upcoming</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </Select>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={submit} loading={saving}>
          {eventId ? "Save changes" : "Add event"}
        </Button>
      </div>
    </div>
  );
}

function AttendanceTab({
  event,
  members,
  attendedIds,
}: {
  event: CommunityEvent;
  members: MemberOption[];
  attendedIds: Set<string>;
}) {
  const [checked, setChecked] = useState(attendedIds);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const toggle = async (memberId: string) => {
    const attended = !checked.has(memberId);
    setBusyId(memberId);
    const next = new Set(checked);
    if (attended) next.add(memberId);
    else next.delete(memberId);
    setChecked(next);
    const result = await setAttendance({ eventId: event.id, memberId, attended });
    setBusyId(null);
    if (result.error) {
      setChecked(checked); // rollback
      toast(result.error, "error");
    } else {
      router.refresh();
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink/60">
        Check off who was in the room —{" "}
        <span className="font-mono">{checked.size}</span> attended. This feeds
        the Hive metrics.
      </p>
      <div className="max-h-80 divide-y divide-line-soft overflow-y-auto rounded-md border border-line-soft">
        {members.map((m) => (
          <label
            key={m.id}
            className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-ink/[0.03]"
          >
            <input
              type="checkbox"
              checked={checked.has(m.id)}
              disabled={busyId === m.id}
              onChange={() => toggle(m.id)}
              className="h-4 w-4 accent-[#E0A82E]"
            />
            <span className="min-w-0">
              <span className="block truncate text-sm">{m.full_name}</span>
              <span className="block truncate text-xs text-ink/50">
                {m.company}
              </span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function EventsAdmin({
  events,
  members,
  attendance,
}: {
  events: CommunityEvent[];
  members: MemberOption[];
  attendance: { event_id: string; member_id: string }[];
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CommunityEvent | null>(null);
  const [editorTab, setEditorTab] = useState<"details" | "attendance">("details");
  const [deleting, setDeleting] = useState<CommunityEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const attendanceByEvent = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const a of attendance) {
      if (!map.has(a.event_id)) map.set(a.event_id, new Set());
      map.get(a.event_id)!.add(a.member_id);
    }
    return map;
  }, [attendance]);

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    const result = await deleteEvent(deleting.id);
    setBusy(false);
    setDeleting(null);
    if (result.error) return toast(result.error, "error");
    toast("Event deleted");
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>Add event</Button>
      </div>
      {events.length === 0 ? (
        <EmptyState
          title="No events yet"
          description="Add the next PodHive date."
          action={<Button onClick={() => setCreating(true)}>Add event</Button>}
        />
      ) : (
        <Card className="divide-y divide-line-soft">
          {events.map((e) => (
            <div key={e.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{e.name}</p>
                <p className="truncate text-xs text-ink/50">
                  {e.city}, {e.country} ·{" "}
                  {formatEventDate(e.event_date, e.timezone)} ·{" "}
                  {attendanceByEvent.get(e.id)?.size ?? 0} attended
                </p>
              </div>
              <Badge
                tone={
                  e.status === "upcoming"
                    ? "accent"
                    : e.status === "completed"
                      ? "success"
                      : "danger"
                }
              >
                {e.status}
              </Badge>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(e);
                    setEditorTab("details");
                  }}
                >
                  Edit
                </Button>
                <Button size="sm" variant="danger" onClick={() => setDeleting(e)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Add event"
        wide
      >
        <DetailsForm initial={EMPTY} onDone={() => setCreating(false)} />
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.name ?? "Edit event"}
        wide
      >
        {editing && (
          <div className="space-y-4">
            <Tabs<"details" | "attendance">
              items={[
                { value: "details", label: "Details" },
                {
                  value: "attendance",
                  label: "Attendance",
                  count: attendanceByEvent.get(editing.id)?.size ?? 0,
                },
              ]}
              value={editorTab}
              onChange={setEditorTab}
            />
            {editorTab === "details" ? (
              <DetailsForm
                eventId={editing.id}
                initial={{
                  name: editing.name,
                  city: editing.city,
                  country: editing.country,
                  event_date: editing.event_date,
                  timezone: editing.timezone,
                  description: editing.description ?? "",
                  cover_image_url: editing.cover_image_url ?? "",
                  status: editing.status,
                }}
                onDone={() => setEditing(null)}
              />
            ) : (
              <AttendanceTab
                event={editing}
                members={members}
                attendedIds={attendanceByEvent.get(editing.id) ?? new Set()}
              />
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete event"
      >
        <p className="text-sm text-ink/80">
          Delete &ldquo;{deleting?.name}&rdquo; with its RSVPs and attendance?
          This can&apos;t be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete} loading={busy}>
            Delete event
          </Button>
        </div>
      </Modal>
    </div>
  );
}
