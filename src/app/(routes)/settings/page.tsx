const secrets = [
  { name: "Mapbox Access Token", env: "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN" },
  { name: "Supabase URL", env: "NEXT_PUBLIC_SUPABASE_URL" },
  { name: "Supabase Anon Key", env: "NEXT_PUBLIC_SUPABASE_ANON_KEY" },
  { name: "Supabase Service Role Key", env: "SUPABASE_SERVICE_ROLE_KEY" },
  { name: "Twilio Account SID", env: "TWILIO_ACCOUNT_SID" },
  { name: "Twilio Auth Token", env: "TWILIO_AUTH_TOKEN" },
  { name: "Twilio From Number", env: "TWILIO_FROM_NUMBER" },
  { name: "Rewards Threshold", env: "REWARDS_THRESHOLD_MINUTES" },
  { name: "App URL", env: "NEXT_PUBLIC_APP_URL" }
];

export default function SettingsPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-sm text-zinc-400">
          All credentials are stored securely via Vercel environment variables. Mirror them
          locally by creating a <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-brand-peach">.env.local</code> file.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {secrets.map((secret) => (
          <article
            key={secret.env}
            className="rounded-xl border border-zinc-800/50 bg-zinc-950/80 p-4 backdrop-blur transition-all hover:border-brand-cherry/30"
          >
            <h2 className="text-sm font-semibold text-white">{secret.name}</h2>
            <p className="text-xs font-mono text-brand-peach">{secret.env}</p>
            <p className="mt-2 text-xs text-zinc-500">
              Manage via Vercel Project → Settings → Environment Variables. Never commit
              secrets to git.
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
