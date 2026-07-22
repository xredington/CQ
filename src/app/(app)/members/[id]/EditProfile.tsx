"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "./actions";

interface ProfileForm {
  full_name: string;
  designation: string;
  bio: string;
}

export function EditProfile({
  member,
}: {
  member: {
    full_name: string;
    designation: string | null;
    bio: string | null;
    avatar_url: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ProfileForm>({
    defaultValues: {
      full_name: member.full_name,
      designation: member.designation ?? "",
      bio: member.bio ?? "",
    },
  });

  const bioLength = watch("bio").length;

  const onPickAvatar = (file: File | null) => {
    setAvatarError(null);
    if (!file) return setAvatarFile(null);
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("That image is over 2MB. Pick a smaller one.");
      return;
    }
    setAvatarFile(file);
  };

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    try {
      let avatar_url: string | undefined;
      if (avatarFile) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("signed out");
        const ext = avatarFile.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/avatar-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true });
        if (uploadError) {
          setAvatarError("The image couldn't be uploaded. Try again.");
          setSaving(false);
          return;
        }
        avatar_url = supabase.storage.from("avatars").getPublicUrl(path)
          .data.publicUrl;
      }

      const result = await updateProfile({
        full_name: values.full_name,
        designation: values.designation || undefined,
        bio: values.bio || undefined,
        avatar_url,
      });
      if (result.error) {
        toast(result.error, "error");
      } else {
        toast("Changes saved");
        setOpen(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  });

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Edit profile
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit profile">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar
              name={member.full_name}
              src={
                avatarFile ? URL.createObjectURL(avatarFile) : member.avatar_url
              }
              size="lg"
            />
            <div className="flex-1">
              <label
                htmlFor="avatar-upload"
                className="mb-1.5 block text-sm text-ink/80"
              >
                Photo
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => onPickAvatar(e.target.files?.[0] ?? null)}
                className="block w-full text-xs text-ink/60 file:mr-3 file:rounded-md file:border file:border-line file:bg-transparent file:px-3 file:py-1.5 file:text-xs file:text-ink"
              />
              <p className="mt-1.5 text-xs text-ink/50">
                Square images crop best into the hex. 2MB max.
              </p>
              {avatarError && (
                <p className="mt-1.5 text-xs text-danger">{avatarError}</p>
              )}
            </div>
          </div>
          <Input
            label="Name"
            {...register("full_name", {
              required: "Enter your name.",
              minLength: { value: 2, message: "Enter your name." },
            })}
            error={errors.full_name?.message}
          />
          <Input label="Designation" {...register("designation")} />
          <Textarea
            label="Bio"
            rows={4}
            maxLength={400}
            hint={`${bioLength}/400`}
            {...register("bio", {
              maxLength: {
                value: 400,
                message: "Keep your bio under 400 characters.",
              },
            })}
            error={errors.bio?.message}
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save changes
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
