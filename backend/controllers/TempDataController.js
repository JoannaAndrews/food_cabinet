import dotenv from "dotenv";
dotenv.config();

//to get weight data
export async function getTempData(req, res) {
  const listUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CF_KV_NAMESPACE_ID}/keys?prefix=sensor:`;

  const list = await fetch(listUrl, {
    headers: {
      "Authorization": `Bearer ${process.env.CF_KV_API_TOKEN}`
    }
  }).then(r => r.json());

  const keys = list.result.map(k => k.name);

  // Fetch each entry
  const values = await Promise.all(
    keys.map(async (key) => {
      const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CF_KV_NAMESPACE_ID}/values/${key}`;
      const val = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${process.env.CF_KV_API_TOKEN}`
        }
      }).then(r => r.json());
      return val;
    })
  );

  // Sort by time
  values.sort((a, b) => new Date(a.time) - new Date(b.time));

  res.json(values);
}