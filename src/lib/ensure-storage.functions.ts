import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const ensureStorageBuckets = createServerFn({ method: "POST" }).handler(async () => {
  const admin = supabaseAdmin as any;
  const { error } = await admin.storage.createBucket("certificates", {
    public: true,
    fileSizeLimit: 52428800, // 50 MB
  });
  // Ignore "already exists" — bucket may have been created before
  if (error && !error.message?.toLowerCase().includes("already exist")) {
    console.error("[storage] createBucket:", error.message);
  }
  return { ok: true };
});
