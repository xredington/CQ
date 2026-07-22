import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { NewDiscussionForm } from "./NewDiscussionForm";

export const metadata: Metadata = { title: "Start a discussion" };

export default function NewDiscussionPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Start a discussion"
        description="Real questions and real numbers get the best answers."
      />
      <NewDiscussionForm />
    </div>
  );
}
