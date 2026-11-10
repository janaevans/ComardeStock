import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getProviderStatus } from "@/lib/providers/status";
import { getUserSettings } from "@/lib/db/users";
import { PageHeader, Notice } from "@/components/ui";
import { ProviderSettings } from "./ProviderSettings";

export const dynamic = "force-dynamic";
export const metadata = { title: "API providers" };

export default async function ProvidersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [providers, settings] = await Promise.all([getProviderStatus(user.id), getUserSettings(user.id)]);
  const encryptionReady = Boolean(process.env.ENCRYPTION_KEY);

  return (
    <>
      <PageHeader title="API providers & settings" subtitle="Keys are encrypted (AES-256-GCM) on the server and never sent back to your browser." />
      {!encryptionReady && (
        <div className="mb-4">
          <Notice tone="error" title="Server encryption key missing">
            The operator must set <code className="num">ENCRYPTION_KEY</code> before API keys can be saved. Server-level keys from environment variables still work.
          </Notice>
        </div>
      )}
      <ProviderSettings
        initialProviders={providers.map((p) => ({ ...p, updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : null }))}
        initialPreferred={settings.marketDataProvider || ""}
        encryptionReady={encryptionReady}
      />
    </>
  );
}
