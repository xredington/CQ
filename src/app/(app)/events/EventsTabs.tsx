"use client";

import { useState, useTransition } from "react";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { formatEventDate } from "@/lib/dates";
import type { CommunityEvent, RsvpStatus } from "@/lib/database.types";
import { rsvp } from "./actions";

export interface EventWithMeta extends CommunityEvent {
  goingCount: number;
  myRsvp: RsvpStatus | null;
  attendeeCount: number;
}

function UpcomingCard({ event }: { event: EventWithMeta }) {
  const [myRsvp, setMyRsvp] = useState(event.myRsvp);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  const respond = (status: RsvpStatus) => {
    const previous = myRsvp;
    setMyRsvp(status);
    startTransition(async () => {
      const result = await rsvp({ eventId: event.id, status });
      if (result.error) {
        setMyRsvp(previous);
        toast(result.error, "error");
      } else {
        toast(status === "going" ? "You're on the list" : "Noted — maybe next time");
      }
    });
  };

  const goingCount =
    event.goingCount +
    (myRsvp === "going" && event.myRsvp !== "going" ? 1 : 0) -
    (myRsvp !== "going" && event.myRsvp === "going" ? 1 : 0);

  return (
    <Card className="overflow-hidden">
      {event.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.cover_image_url}
          alt=""
          className="h-40 w-full object-cover"
        />
      )}
      <div className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-xl">{event.name}</h3>
            <p className="mt-1 text-sm text-ink/60">
              {event.city}, {event.country} ·{" "}
              {formatEventDate(event.event_date, event.timezone)}
            </p>
          </div>
          <Badge tone="accent">Upcoming</Badge>
        </div>
        {event.description && (
          <p className="mt-3 max-w-measure text-sm leading-relaxed text-ink/70">
            {event.description}
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            variant={myRsvp === "going" ? "primary" : "secondary"}
            onClick={() => respond("going")}
            disabled={pending}
          >
            I&apos;ll be there
          </Button>
          <Button
            variant={myRsvp === "not_going" ? "primary" : "secondary"}
            onClick={() => respond("not_going")}
            disabled={pending}
          >
            Can&apos;t make it
          </Button>
          <span className="ml-auto flex items-center gap-1.5 text-sm text-ink/60">
            <Users className="h-4 w-4" aria-hidden />
            <span className="font-mono">{goingCount}</span> going
          </span>
        </div>
      </div>
    </Card>
  );
}

export function EventsTabs({ events }: { events: EventWithMeta[] }) {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const upcoming = events
    .filter((e) => e.status === "upcoming")
    .sort((a, b) => a.event_date.localeCompare(b.event_date));
  const past = events.filter((e) => e.status === "completed");

  return (
    <div className="space-y-5">
      <Tabs<"upcoming" | "past">
        items={[
          { value: "upcoming", label: "Upcoming", count: upcoming.length },
          { value: "past", label: "Past", count: past.length },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "upcoming" &&
        (upcoming.length === 0 ? (
          <EmptyState
            title="No upcoming events"
            description="The next PodHive date lands here as soon as it's announced."
          />
        ) : (
          <div className="space-y-4">
            {upcoming.map((e) => (
              <UpcomingCard key={e.id} event={e} />
            ))}
          </div>
        ))}

      {tab === "past" &&
        (past.length === 0 ? (
          <EmptyState title="No past events yet" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {past.map((e) => (
              <Card key={e.id} className="p-5">
                <h3 className="font-display text-lg">{e.name}</h3>
                <p className="mt-1 text-sm text-ink/60">
                  {e.city}, {e.country} ·{" "}
                  {formatEventDate(e.event_date, e.timezone)}
                </p>
                <p className="mt-3 flex items-center gap-1.5 text-sm text-ink/60">
                  <Users className="h-4 w-4" aria-hidden />
                  <span className="font-mono">{e.attendeeCount}</span> attended
                </p>
              </Card>
            ))}
          </div>
        ))}
    </div>
  );
}
