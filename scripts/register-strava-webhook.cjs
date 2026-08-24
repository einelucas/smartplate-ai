// scripts/register-strava-webhook.cjs
// Registra (ou lista) a subscription de webhook do Strava. Precisa rodar
// contra um domínio público de produção — o Strava chama STRAVA_REDIRECT_URI
// (mesmo host de STRAVA_CALLBACK_URL) para validar `hub.challenge` antes de
// confirmar a subscription, então não funciona contra localhost.
//
// Uso:
//   node --env-file=.env scripts/register-strava-webhook.cjs create <callbackUrl>
//   node --env-file=.env scripts/register-strava-webhook.cjs list
//   node --env-file=.env scripts/register-strava-webhook.cjs delete <subscriptionId>
const STRAVA_PUSH_SUBSCRIPTIONS_URL = "https://www.strava.com/api/v3/push_subscriptions";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Faltando variável de ambiente: ${name}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const [, , action, arg] = process.argv;
  const clientId = requireEnv("STRAVA_CLIENT_ID");
  const clientSecret = requireEnv("STRAVA_CLIENT_SECRET");
  const verifyToken = requireEnv("STRAVA_WEBHOOK_VERIFY_TOKEN");

  if (action === "create") {
    const callbackUrl = arg;
    if (!callbackUrl) {
      console.error("Uso: create <callbackUrl pública, ex.: https://seu-dominio.com/api/integrations/strava/webhook>");
      process.exit(1);
    }
    const res = await fetch(STRAVA_PUSH_SUBSCRIPTIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, callback_url: callbackUrl, verify_token: verifyToken }).toString(),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.error("Falha ao criar subscription:", res.status, data);
      process.exit(1);
    }
    console.log("Subscription criada:", data);
    return;
  }

  if (action === "list") {
    const params = new URLSearchParams({ client_id: clientId, client_secret: clientSecret });
    const res = await fetch(`${STRAVA_PUSH_SUBSCRIPTIONS_URL}?${params.toString()}`);
    const data = await res.json().catch(() => null);
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (action === "delete") {
    const subscriptionId = arg;
    if (!subscriptionId) {
      console.error("Uso: delete <subscriptionId>");
      process.exit(1);
    }
    const params = new URLSearchParams({ client_id: clientId, client_secret: clientSecret });
    const res = await fetch(`${STRAVA_PUSH_SUBSCRIPTIONS_URL}/${subscriptionId}?${params.toString()}`, { method: "DELETE" });
    if (!res.ok) {
      console.error("Falha ao remover subscription:", res.status, await res.text().catch(() => ""));
      process.exit(1);
    }
    console.log("Subscription removida.");
    return;
  }

  console.error("Uso: node scripts/register-strava-webhook.cjs <create|list|delete> [arg]");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
