export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const driverName = searchParams.get("driver") ?? "driver";

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy">Hello ${driverName}. Operations is requesting a status update. Please contact the HeySalad dispatch channel immediately.</Say>
</Response>`;

  return new Response(twiml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml"
    }
  });
}
