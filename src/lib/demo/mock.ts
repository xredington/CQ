/**
 * DEMO MODE mock Supabase client (NEXT_PUBLIC_DEMO_MODE=1 only).
 * Implements just enough of the supabase-js surface used by this app to
 * render every screen from in-memory fixtures — no network, no RLS.
 * Never a substitute for the real stack; integration behaviour is only
 * proven against Supabase itself.
 */

import { buildFixtures, DEMO_DEFAULT_EMAIL, type DemoStore } from "./fixtures";

export const isDemoMode = () => process.env.NEXT_PUBLIC_DEMO_MODE === "1";

type Row = Record<string, unknown>;
type Result = { data: unknown; error: { code?: string; message: string } | null; count: number | null };

const FKS: { from: string; col: string; to: string }[] = [
  { from: "members", col: "referred_by", to: "members" },
  { from: "members", col: "joined_event_id", to: "events" },
  { from: "event_rsvps", col: "event_id", to: "events" },
  { from: "event_rsvps", col: "member_id", to: "members" },
  { from: "event_attendance", col: "event_id", to: "events" },
  { from: "event_attendance", col: "member_id", to: "members" },
  { from: "solution_interests", col: "solution_id", to: "solutions" },
  { from: "solution_interests", col: "member_id", to: "members" },
  { from: "posts", col: "author_id", to: "members" },
  { from: "replies", col: "post_id", to: "posts" },
  { from: "replies", col: "author_id", to: "members" },
  { from: "post_likes", col: "post_id", to: "posts" },
  { from: "post_likes", col: "member_id", to: "members" },
  { from: "spotlights", col: "member_id", to: "members" },
];

const UNIQUES: Record<string, string[][]> = {
  members: [["email"]],
  solution_interests: [["solution_id", "member_id"]],
  post_likes: [["post_id", "member_id"]],
  event_rsvps: [["event_id", "member_id"]],
  event_attendance: [["event_id", "member_id"]],
};

function getStore(): DemoStore {
  const g = globalThis as { __codehiveDemoStore?: DemoStore };
  if (!g.__codehiveDemoStore) g.__codehiveDemoStore = buildFixtures();
  return g.__codehiveDemoStore;
}

function tableRows(store: DemoStore, table: string): Row[] {
  if (table === "member_recruit_counts") {
    const members = store.members!;
    const childrenOf = new Map<string, string[]>();
    for (const m of members) {
      const ref = m.referred_by as string | null;
      if (ref) childrenOf.set(ref, [...(childrenOf.get(ref) ?? []), m.id as string]);
    }
    const downline = (id: string): number => {
      const direct = childrenOf.get(id) ?? [];
      return direct.length + direct.reduce((sum, c) => sum + downline(c), 0);
    };
    return members.map((m) => ({
      member_id: m.id,
      direct_recruits: (childrenOf.get(m.id as string) ?? []).length,
      total_downline: downline(m.id as string),
    }));
  }
  if (!store[table]) store[table] = [];
  return store[table]!;
}

/** Split a PostgREST select string on top-level commas. */
function splitSelect(sel: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of sel) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function applyEmbeds(store: DemoStore, table: string, row: Row, sel: string): Row {
  const out: Row = { ...row };
  for (const part of splitSelect(sel)) {
    const embed = /^(?:([\w-]+):)?([\w-]+)\((.*)\)$/s.exec(part);
    if (!embed) continue;
    const alias = embed[1] ?? embed[2]!;
    const target = embed[2]!;
    const toOne = FKS.find((f) => f.from === table && f.to === target);
    if (toOne && row[toOne.col] != null) {
      out[alias] =
        tableRows(store, target).find((r) => r.id === row[toOne.col]) ?? null;
    } else if (toOne) {
      out[alias] = null;
    } else {
      const toMany = FKS.find((f) => f.from === target && f.to === table);
      out[alias] = toMany
        ? tableRows(store, target).filter((r) => r[toMany.col] === row.id)
        : [];
    }
  }
  return out;
}

type Filter = (row: Row) => boolean;

class MockQuery implements PromiseLike<Result> {
  private filters: Filter[] = [];
  private sel = "*";
  private orderBy: { col: string; asc: boolean } | null = null;
  private limitN: number | null = null;
  private wantCount = false;
  private head = false;
  private mode: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: Row | Row[] | null = null;
  private onConflict: string[] | null = null;
  private returning = false;
  private singleMode: "single" | "maybe" | null = null;

  constructor(
    private store: DemoStore,
    private table: string
  ) {}

  select(sel = "*", opts?: { count?: string; head?: boolean }) {
    if (this.mode === "select") this.sel = sel;
    else this.returning = true, (this.sel = sel);
    if (opts?.count) this.wantCount = true;
    if (opts?.head) this.head = true;
    return this;
  }
  insert(payload: Row | Row[]) {
    this.mode = "insert";
    this.payload = payload;
    return this;
  }
  upsert(payload: Row | Row[], opts?: { onConflict?: string }) {
    this.mode = "upsert";
    this.payload = payload;
    this.onConflict = opts?.onConflict?.split(",").map((s) => s.trim()) ?? null;
    return this;
  }
  update(payload: Row) {
    this.mode = "update";
    this.payload = payload;
    return this;
  }
  delete() {
    this.mode = "delete";
    return this;
  }
  eq(col: string, value: unknown) {
    this.filters.push((r) => r[col] === value);
    return this;
  }
  neq(col: string, value: unknown) {
    this.filters.push((r) => r[col] !== value);
    return this;
  }
  gte(col: string, value: string) {
    this.filters.push((r) => String(r[col] ?? "") >= value);
    return this;
  }
  in(col: string, values: unknown[]) {
    this.filters.push((r) => values.includes(r[col]));
    return this;
  }
  ilike(col: string, pattern: string) {
    const regex = new RegExp(
      `^${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*")}$`,
      "i"
    );
    this.filters.push((r) => regex.test(String(r[col] ?? "")));
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy = { col, asc: opts?.ascending !== false };
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  single() {
    this.singleMode = "single";
    return this;
  }
  maybeSingle() {
    this.singleMode = "maybe";
    return this;
  }

  private violatesUnique(row: Row, ignoreId?: unknown): { code: string; message: string } | null {
    for (const cols of UNIQUES[this.table] ?? []) {
      const clash = tableRows(this.store, this.table).find(
        (r) =>
          r.id !== ignoreId &&
          cols.every(
            (c) =>
              String(r[c] ?? "").toLowerCase() ===
              String(row[c] ?? "").toLowerCase()
          )
      );
      if (clash) return { code: "23505", message: "duplicate key value" };
    }
    return null;
  }

  private execute(): Result {
    const rows = tableRows(this.store, this.table);
    const matches = () => rows.filter((r) => this.filters.every((f) => f(r)));

    if (this.mode === "insert" || this.mode === "upsert") {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload!];
      const inserted: Row[] = [];
      for (const item of items) {
        if (this.mode === "upsert" && this.onConflict) {
          const existing = rows.find((r) =>
            this.onConflict!.every((c) => r[c] === item[c])
          );
          if (existing) {
            Object.assign(existing, item);
            inserted.push(existing);
            continue;
          }
        }
        const dup = this.violatesUnique(item);
        if (dup) return { data: null, error: dup, count: null };
        const row: Row = {
          id: `demo-${Math.random().toString(36).slice(2, 10)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...item,
        };
        rows.push(row);
        inserted.push(row);
      }
      const data = this.returning
        ? this.singleMode
          ? inserted[0] ?? null
          : inserted
        : null;
      return { data, error: null, count: null };
    }

    if (this.mode === "update") {
      for (const row of matches()) {
        const merged = { ...row, ...this.payload! };
        const dup = this.violatesUnique(merged, row.id);
        if (dup) return { data: null, error: dup, count: null };
        Object.assign(row, this.payload!, { updated_at: new Date().toISOString() });
      }
      return { data: null, error: null, count: null };
    }

    if (this.mode === "delete") {
      const doomed = new Set(matches().map((r) => r.id));
      this.store[this.table] = rows.filter((r) => !doomed.has(r.id));
      // cascade deletes used by the app
      if (this.table === "posts") {
        this.store.replies = (this.store.replies ?? []).filter((r) => !doomed.has(r.post_id));
        this.store.post_likes = (this.store.post_likes ?? []).filter((r) => !doomed.has(r.post_id));
      }
      return { data: null, error: null, count: null };
    }

    let result = matches();
    const count = this.wantCount ? result.length : null;
    if (this.orderBy) {
      const { col, asc } = this.orderBy;
      result = [...result].sort((a, b) => {
        const av = a[col], bv = b[col];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return asc ? cmp : -cmp;
      });
    }
    if (this.limitN != null) result = result.slice(0, this.limitN);
    const projected = result.map((r) => applyEmbeds(this.store, this.table, r, this.sel));

    if (this.head) return { data: null, error: null, count };
    if (this.singleMode) {
      if (projected.length === 0) {
        return this.singleMode === "maybe"
          ? { data: null, error: null, count }
          : { data: null, error: { message: "no rows" }, count };
      }
      return { data: projected[0], error: null, count };
    }
    return { data: projected, error: null, count };
  }

  then<T1 = Result, T2 = never>(
    onfulfilled?: ((value: Result) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null
  ): PromiseLike<T1 | T2> {
    try {
      return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
    } catch (e) {
      return Promise.resolve({
        data: null,
        error: { message: e instanceof Error ? e.message : "demo error" },
        count: null,
      } as Result).then(onfulfilled, onrejected);
    }
  }
}

export function createDemoClient(getEmail: () => string | null) {
  const store = getStore();

  const currentMember = () => {
    const email = (getEmail() ?? DEMO_DEFAULT_EMAIL).toLowerCase();
    return (
      store.members!.find((m) => String(m.email).toLowerCase() === email) ??
      store.members!.find((m) => String(m.email) === DEMO_DEFAULT_EMAIL) ??
      null
    );
  };

  const channelStub = {
    on() {
      return channelStub;
    },
    subscribe() {
      return channelStub;
    },
  };

  return {
    from(table: string) {
      return new MockQuery(store, table);
    },
    rpc(name: string, params?: Record<string, unknown>) {
      let data: unknown = null;
      if (name === "event_attendee_count") {
        data = (store.event_attendance ?? []).filter(
          (a) => a.event_id === params?.p_event_id
        ).length;
      }
      return Promise.resolve({ data, error: null });
    },
    auth: {
      async getUser() {
        const m = currentMember();
        return {
          data: {
            user: m ? { id: m.auth_user_id as string, email: m.email as string } : null,
          },
        };
      },
      async signInWithOtp() {
        return { error: null };
      },
      async signOut() {
        return { error: null };
      },
      async exchangeCodeForSession() {
        return { error: null };
      },
      async verifyOtp() {
        return { error: null };
      },
    },
    storage: {
      from(bucket: string) {
        return {
          async upload(path: string) {
            return { data: { path }, error: null };
          },
          getPublicUrl(path: string) {
            return { data: { publicUrl: `/demo-storage/${bucket}/${path}` } };
          },
        };
      },
    },
    channel() {
      return channelStub;
    },
    removeChannel() {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}
