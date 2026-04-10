import dotenv from "dotenv";
dotenv.config();

export async function kvPut(key, value, ttlSeconds) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CF_KV_NAMESPACE_ID}/values/${key}`;

  return fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${process.env.CF_KV_API_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(value),
    // TTL in seconds
    cf: { expiration_ttl: ttlSeconds }
  });
}
