import { ensureStorageBuckets } from "@/lib/ensure-storage.functions";
import { supabase } from "@/integrations/supabase/client";

// Called at most once per session — creates the bucket if it doesn't exist yet
let _ensurePromise: Promise<void> | null = null;
function ensureOnce() {
  if (!_ensurePromise) {
    _ensurePromise = ensureStorageBuckets().then(() => {});
  }
  return _ensurePromise;
}

export async function uploadToStorage(bucket: string, path: string, file: File): Promise<string> {
  await ensureOnce();
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
