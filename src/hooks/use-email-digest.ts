import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { runEmailDigest } from "@/lib/email-digest.functions";

export function useEmailDigest(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const checkAndRunDigest = async () => {
      try {
        const key = `email-digest:${new Date().toISOString().slice(0, 10)}`;
        const { data } = await supabase
          .from("app_data")
          .select("key")
          .eq("key", key)
          .maybeSingle();

        if (!data) {
          await runEmailDigest({ data: undefined });
        }
      } catch (err) {
        console.warn(err);
      }
    };

    checkAndRunDigest();
  }, [enabled]);
}
