"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { downloadCsv } from "@/lib/csv";
import { formatDate } from "@/lib/dates";
import type { InterestRow } from "./page";

export function InterestsTable({ interests }: { interests: InterestRow[] }) {
  const exportCsv = () => {
    downloadCsv("codehive-interests.csv", [
      ["Date", "Member", "Company", "Member email", "Solution", "Solution owner", "Note"],
      ...interests.map((i) => [
        formatDate(i.created_at),
        i.member?.full_name ?? "",
        i.member?.company ?? "",
        i.member?.email ?? "",
        i.solution?.title ?? "",
        i.solution?.owner_name ?? "",
        i.note ?? "",
      ]),
    ]);
  };

  if (interests.length === 0) {
    return (
      <EmptyState
        title="No interests captured yet"
        description="Every 'I'm interested' click lands here as a warm lead."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink/60">
          <span className="font-mono">{interests.length}</span> warm leads —
          hand each to its solution owner.
        </p>
        <Button variant="secondary" onClick={exportCsv}>
          <Download className="h-4 w-4" aria-hidden /> Export CSV
        </Button>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead className="border-b border-line-soft text-xs uppercase tracking-wider text-ink/50">
            <tr>
              <th className="px-4 py-3 font-normal">Member</th>
              <th className="px-4 py-3 font-normal">Company</th>
              <th className="px-4 py-3 font-normal">Solution</th>
              <th className="px-4 py-3 font-normal">Note</th>
              <th className="px-4 py-3 font-normal">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {interests.map((i) => (
              <tr key={i.id} className="align-top hover:bg-ink/[0.02]">
                <td className="px-4 py-2.5 font-medium">
                  {i.member?.full_name ?? "—"}
                  <span className="block text-xs font-normal text-ink/50">
                    {i.member?.email}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-ink/70">
                  {i.member?.company ?? "—"}
                </td>
                <td className="px-4 py-2.5 text-ink/70">
                  {i.solution?.title ?? "—"}
                  {i.solution?.owner_name && (
                    <span className="block text-xs text-ink/50">
                      Owner: {i.solution.owner_name}
                    </span>
                  )}
                </td>
                <td className="max-w-72 px-4 py-2.5 text-ink/70">
                  {i.note ?? <span className="text-ink/40">—</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-ink/60">
                  {formatDate(i.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
