"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Upload } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { INDUSTRIES, INDUSTRY_LABELS } from "@/lib/constants";
import { parseCsv } from "@/lib/csv";
import type { CommunityEvent, Member } from "@/lib/database.types";
import {
  addMember,
  importMembers,
  setMemberStatus,
  updateMember,
  type ImportReport,
  type ImportRow,
} from "./actions";

type EventOption = Pick<CommunityEvent, "id" | "name">;

const STATUS_TONE = {
  active: "success",
  invited: "neutral",
  deactivated: "danger",
} as const;

const EMPTY_FORM = {
  full_name: "",
  email: "",
  company: "",
  designation: "",
  industry: "",
  country: "",
  referred_by: "",
  joined_event_id: "",
  role: "member" as "member" | "admin",
};

function MemberForm({
  initial,
  memberId,
  members,
  events,
  onDone,
}: {
  initial: typeof EMPTY_FORM;
  memberId?: string;
  members: Member[];
  events: EventOption[];
  onDone: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const set = (key: keyof typeof EMPTY_FORM, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    setSaving(true);
    const payload = { ...form, role: form.role };
    const result = memberId
      ? await updateMember({ id: memberId, ...payload })
      : await addMember(payload);
    setSaving(false);
    if (result.error) return toast(result.error, "error");
    toast(memberId ? "Changes saved" : "Member added — they can sign in now");
    onDone();
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <Input
        label="Name"
        value={form.full_name}
        onChange={(e) => set("full_name", e.target.value)}
      />
      <Input
        label="Work email"
        type="email"
        value={form.email}
        onChange={(e) => set("email", e.target.value)}
        hint="Adding a member allowlists this email for sign-in."
      />
      <Input
        label="Company"
        value={form.company}
        onChange={(e) => set("company", e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Designation"
          value={form.designation}
          onChange={(e) => set("designation", e.target.value)}
        />
        <Input
          label="Country"
          value={form.country}
          onChange={(e) => set("country", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Industry"
          value={form.industry}
          onChange={(e) => set("industry", e.target.value)}
        >
          <option value="">Not set</option>
          {INDUSTRIES.map((i) => (
            <option key={i} value={i}>
              {INDUSTRY_LABELS[i]}
            </option>
          ))}
        </Select>
        <Select
          label="Role"
          value={form.role}
          onChange={(e) => set("role", e.target.value as "member" | "admin")}
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </Select>
      </div>
      <Select
        label="Referred by"
        value={form.referred_by}
        onChange={(e) => set("referred_by", e.target.value)}
      >
        <option value="">No referrer (root member)</option>
        {members
          .filter((m) => m.id !== memberId)
          .map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name} — {m.company}
            </option>
          ))}
      </Select>
      <Select
        label="Joined at event"
        value={form.joined_event_id}
        onChange={(e) => set("joined_event_id", e.target.value)}
      >
        <option value="">No event</option>
        {events.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </Select>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={submit} loading={saving}>
          {memberId ? "Save changes" : "Add member"}
        </Button>
      </div>
    </div>
  );
}

const CSV_FIELDS = [
  { key: "full_name", label: "Name", required: true },
  { key: "email", label: "Email", required: true },
  { key: "company", label: "Company", required: true },
  { key: "designation", label: "Designation", required: false },
  { key: "industry", label: "Industry", required: false },
  { key: "country", label: "Country", required: false },
  { key: "referred_by_email", label: "Referred by (email)", required: false },
] as const;

type CsvFieldKey = (typeof CSV_FIELDS)[number]["key"];

function CsvImport({ onDone }: { onDone: () => void }) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<CsvFieldKey, number | -1>>({
    full_name: -1,
    email: -1,
    company: -1,
    designation: -1,
    industry: -1,
    country: -1,
    referred_by_email: -1,
  });
  const [report, setReport] = useState<ImportReport | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  const onFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length < 2) {
      toast("That file has no data rows below the header.", "error");
      return;
    }
    const [head, ...body] = parsed;
    setHeaders(head!);
    setRows(body);
    setReport(null);
    // Auto-map by fuzzy header match.
    const nextMapping = { ...mapping };
    CSV_FIELDS.forEach(({ key }) => {
      const target = key.replace(/_/g, "").toLowerCase();
      const index = head!.findIndex((h) => {
        const header = h.trim().replace(/[\s_-]/g, "").toLowerCase();
        return (
          header === target ||
          (key === "full_name" && header === "name") ||
          (key === "referred_by_email" &&
            ["referredby", "referrer", "referreremail"].includes(header))
        );
      });
      nextMapping[key] = index;
    });
    setMapping(nextMapping);
  };

  const missingRequired = CSV_FIELDS.filter(
    (f) => f.required && mapping[f.key] === -1
  );

  const runImport = async () => {
    setImporting(true);
    const payload: ImportRow[] = rows.map((row) => {
      const value = (key: CsvFieldKey) =>
        mapping[key] === -1 ? undefined : row[mapping[key]]?.trim();
      return {
        full_name: value("full_name") ?? "",
        email: value("email") ?? "",
        company: value("company") ?? "",
        designation: value("designation"),
        industry: value("industry"),
        country: value("country"),
        referred_by_email: value("referred_by_email") || undefined,
      };
    });
    const result = await importMembers(payload);
    setImporting(false);
    setReport(result);
    if (result.error) toast(result.error, "error");
    else router.refresh();
  };

  if (report && !report.error) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink/90">
          <strong className="text-accent">{report.added} added</strong>
          {report.skipped.length > 0 && (
            <>, {report.skipped.length} skipped</>
          )}
          .
        </p>
        {report.skipped.length > 0 && (
          <ul className="max-h-52 space-y-1 overflow-y-auto rounded-md border border-line-soft p-3 text-xs text-ink/70">
            {report.skipped.map((s, i) => (
              <li key={i}>
                Row {s.row} {s.email ? `(${s.email})` : ""}: {s.reason}
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end">
          <Button onClick={onDone}>Done</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      {rows.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-ink/70">
            Upload a CSV with one member per row. Needed columns: name, email,
            company. Optional: designation, industry, country, referred_by
            (the referrer&apos;s email).
          </p>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" aria-hidden /> Choose CSV file
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-ink/70">
            {rows.length} data rows found. Map the columns, then import.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CSV_FIELDS.map(({ key, label, required }) => (
              <Select
                key={key}
                label={`${label}${required ? " *" : ""}`}
                value={String(mapping[key])}
                onChange={(e) =>
                  setMapping((m) => ({ ...m, [key]: Number(e.target.value) }))
                }
              >
                <option value="-1">Not in file</option>
                {headers.map((h, i) => (
                  <option key={i} value={i}>
                    {h || `Column ${i + 1}`}
                  </option>
                ))}
              </Select>
            ))}
          </div>
          {/* Preview of the first mapped rows */}
          <div className="overflow-x-auto rounded-md border border-line-soft">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line-soft text-ink/50">
                <tr>
                  {CSV_FIELDS.map((f) => (
                    <th key={f.key} className="px-2.5 py-1.5 font-normal">
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {rows.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    {CSV_FIELDS.map((f) => (
                      <td key={f.key} className="px-2.5 py-1.5 text-ink/80">
                        {mapping[f.key] === -1 ? "—" : row[mapping[f.key]] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {missingRequired.length > 0 && (
            <p className="text-xs text-danger">
              Map the required columns first:{" "}
              {missingRequired.map((f) => f.label).join(", ")}.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => fileRef.current?.click()}>
              Pick a different file
            </Button>
            <Button
              onClick={runImport}
              loading={importing}
              disabled={missingRequired.length > 0}
            >
              Import {rows.length} rows
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export function MembersAdmin({
  members,
  events,
}: {
  members: Member[];
  events: EventOption[];
}) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.full_name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.company.toLowerCase().includes(q)
    );
  }, [members, query]);

  const toggleStatus = async (member: Member) => {
    const next = member.status === "deactivated" ? "active" : "deactivated";
    setBusyId(member.id);
    const result = await setMemberStatus(member.id, next);
    setBusyId(null);
    if (result.error) return toast(result.error, "error");
    toast(next === "deactivated" ? "Access paused" : "Access restored");
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-52 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email or company"
            aria-label="Search members"
            className="h-10 w-full rounded-md border border-line bg-bg pl-9 pr-3 text-sm text-ink placeholder:text-ink/40"
          />
        </div>
        <Button variant="secondary" onClick={() => setImporting(true)}>
          <Upload className="h-4 w-4" aria-hidden /> Import CSV
        </Button>
        <Button onClick={() => setAdding(true)}>Add member</Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No members match"
          description="Try a different search, or add the member."
          action={<Button onClick={() => setAdding(true)}>Add member</Button>}
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="border-b border-line-soft text-xs uppercase tracking-wider text-ink/50">
              <tr>
                <th className="px-4 py-3 font-normal">Name</th>
                <th className="px-4 py-3 font-normal">Email</th>
                <th className="px-4 py-3 font-normal">Company</th>
                <th className="px-4 py-3 font-normal">Industry</th>
                <th className="px-4 py-3 font-normal">Country</th>
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-4 py-3 font-normal">Referred by</th>
                <th className="px-4 py-3 font-normal">Role</th>
                <th className="px-4 py-3 font-normal" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-ink/[0.02]">
                  <td className="px-4 py-2.5 font-medium">{m.full_name}</td>
                  <td className="px-4 py-2.5 text-ink/70">{m.email}</td>
                  <td className="px-4 py-2.5 text-ink/70">{m.company}</td>
                  <td className="px-4 py-2.5 text-ink/70">
                    {m.industry ? INDUSTRY_LABELS[m.industry] : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-ink/70">{m.country ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={STATUS_TONE[m.status]}>{m.status}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-ink/70">
                    {m.referred_by
                      ? byId.get(m.referred_by)?.full_name ?? "—"
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-ink/70">{m.role}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditing(m)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant={m.status === "deactivated" ? "secondary" : "danger"}
                        loading={busyId === m.id}
                        onClick={() => toggleStatus(m)}
                      >
                        {m.status === "deactivated" ? "Reactivate" : "Deactivate"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add member"
      >
        <MemberForm
          initial={EMPTY_FORM}
          members={members}
          events={events}
          onDone={() => setAdding(false)}
        />
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit member"
      >
        {editing && (
          <MemberForm
            memberId={editing.id}
            initial={{
              full_name: editing.full_name,
              email: editing.email,
              company: editing.company,
              designation: editing.designation ?? "",
              industry: editing.industry ?? "",
              country: editing.country ?? "",
              referred_by: editing.referred_by ?? "",
              joined_event_id: editing.joined_event_id ?? "",
              role: editing.role,
            }}
            members={members}
            events={events}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal
        open={importing}
        onClose={() => setImporting(false)}
        title="Import members from CSV"
        wide
      >
        <CsvImport onDone={() => setImporting(false)} />
      </Modal>
    </div>
  );
}
