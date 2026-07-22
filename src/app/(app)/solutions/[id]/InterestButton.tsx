"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { sendInterest } from "./actions";

export function InterestButton({
  solutionId,
  alreadyInterested,
}: {
  solutionId: string;
  alreadyInterested: boolean;
}) {
  const [interested, setInterested] = useState(alreadyInterested);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  if (interested) {
    return (
      <Button variant="secondary" disabled className="!opacity-100">
        <Check className="h-4 w-4 text-accent" aria-hidden /> Interest sent
      </Button>
    );
  }

  const submit = async () => {
    setSending(true);
    const result = await sendInterest({ solutionId, note: note || undefined });
    setSending(false);
    if (result.error) {
      toast(result.error, "error");
      return;
    }
    setInterested(true);
    setOpen(false);
    toast("Noted — the Redington solution owner will reach out.");
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>I&apos;m interested</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Send your interest"
      >
        <div className="space-y-4">
          <Textarea
            label="Anything specific you're trying to solve?"
            hint="Optional — it goes straight to the solution owner."
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} loading={sending}>
              Send interest
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
