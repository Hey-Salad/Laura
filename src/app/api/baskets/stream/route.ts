import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const encoder = new TextEncoder();

const formatEvent = (event: string, data: unknown) =>
  encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server credentials are not configured.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode("retry: 1000\n\n"));

      const channel = supabase
        .channel("baskets-stream")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "baskets" },
          (payload) => controller.enqueue(formatEvent("basket", payload))
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            controller.enqueue(formatEvent("ready", { ok: true }));
          }
        });

      const keepAlive = setInterval(() => {
        controller.enqueue(formatEvent("heartbeat", { ts: Date.now() }));
      }, 20000);

      const close = () => {
        clearInterval(keepAlive);
        channel.unsubscribe();
        controller.close();
      };

      request.signal.addEventListener("abort", close);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
