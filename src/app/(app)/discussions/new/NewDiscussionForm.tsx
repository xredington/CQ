"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { POST_CATEGORIES, POST_CATEGORY_LABELS } from "@/lib/constants";
import type { PostCategory } from "@/lib/database.types";
import { createPost } from "../actions";

interface FormValues {
  title: string;
  category: PostCategory;
  body: string;
}

export function NewDiscussionForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { title: "", category: "general", body: "" },
  });

  const titleLength = watch("title").length;

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    const result = await createPost(values);
    if (result.error || !result.id) {
      setSubmitting(false);
      toast(result.error ?? "The discussion couldn't be posted. Try again.", "error");
      return;
    }
    toast("Discussion posted");
    router.push(`/discussions/${result.id}`);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Input
        label="Title"
        maxLength={140}
        hint={`${titleLength}/140`}
        placeholder="What do you want to ask or share?"
        {...register("title", {
          required: "Give it a title of at least 8 characters.",
          minLength: {
            value: 8,
            message: "Give it a title of at least 8 characters.",
          },
          maxLength: {
            value: 140,
            message: "Keep the title under 140 characters.",
          },
        })}
        error={errors.title?.message}
      />
      <Select
        label="Category"
        {...register("category", { required: true })}
        error={errors.category?.message}
      >
        {POST_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {POST_CATEGORY_LABELS[c]}
          </option>
        ))}
      </Select>
      <Textarea
        label="Body"
        rows={10}
        hint="Bold, lists and links supported"
        placeholder="Set the scene, share the numbers, ask the question."
        {...register("body", {
          required: "Say a bit more — at least 20 characters.",
          minLength: {
            value: 20,
            message: "Say a bit more — at least 20 characters.",
          },
        })}
        error={errors.body?.message}
      />
      <div className="flex gap-2">
        <Button type="submit" loading={submitting}>
          Post discussion
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/discussions")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
