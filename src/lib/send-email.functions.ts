import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const InputSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email()).min(1).max(50)]),
  subject: z.string().min(1).max(998),
  html: z.string().min(1).max(500_000),
  from: z.string().min(3).max(320).optional(),
});

export const sendEmail = createServerFn({ method: "POST" })
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: result, error } = await supabaseAdmin.functions.invoke("send-email", {
      body: {
        from: data.from ?? "Qualilab <onboarding@resend.dev>",
        to: Array.isArray(data.to) ? data.to : [data.to],
        subject: data.subject,
        html: data.html,
      },
    });
    if (error) throw new Error(`Email send failed: ${error.message}`);
    return result as { id?: string };
  });
