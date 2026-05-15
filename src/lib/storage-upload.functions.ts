import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const uploadFileToStorage = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        bucket: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
        path: z.string().min(1).max(500),
        contentBase64: z.string().min(1),
        contentType: z.string().min(1).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const admin = supabaseAdmin as any;
    // Garante o bucket
    const { error: bErr } = await admin.storage.createBucket(data.bucket, {
      public: true,
      fileSizeLimit: 52428800,
    });
    if (bErr && !bErr.message?.toLowerCase().includes("already exist")) {
      throw new Error(`bucket: ${bErr.message}`);
    }
    const bytes = Buffer.from(data.contentBase64, "base64");
    const { error } = await admin.storage
      .from(data.bucket)
      .upload(data.path, bytes, { upsert: true, contentType: data.contentType });
    if (error) throw new Error(error.message);
    const { data: pub } = admin.storage.from(data.bucket).getPublicUrl(data.path);
    return { publicUrl: pub.publicUrl as string };
  });
