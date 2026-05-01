import dotenv from "dotenv";
dotenv.config();

const MAX_TIMESTAMPS = 120;
const BASELINE_KEY = "baseline_weight";
const DEFAULT_BASELINE_WEIGHT = 100;
const BASELINE_UPDATE_THRESHOLD = 0.3;

const getKvValueUrl = (key) =>
  `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CF_KV_NAMESPACE_ID}/values/${encodeURIComponent(key)}`;

const getAuthHeaders = () => ({
  "Authorization": `Bearer ${process.env.CF_KV_API_TOKEN}`
});

async function getOrCreateBaselineWeight() {
  const baselineUrl = getKvValueUrl(BASELINE_KEY);
  let baselineRes = await fetch(baselineUrl, {
    headers: getAuthHeaders()
  });

  if (baselineRes.status === 404) {
    await fetch(baselineUrl, {
      method: "PUT",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(DEFAULT_BASELINE_WEIGHT)
    });
    baselineRes = await fetch(baselineUrl, {
      headers: getAuthHeaders()
    });
  }

  if (baselineRes.ok) {
    const raw = await baselineRes.text();
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : DEFAULT_BASELINE_WEIGHT;
  }

  throw new Error(`Failed to fetch baseline_weight (status ${baselineRes.status})`);
}

async function setBaselineWeight(nextBaselineWeight) {
  const baselineUrl = getKvValueUrl(BASELINE_KEY);
  const putRes = await fetch(baselineUrl, {
    method: "PUT",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(nextBaselineWeight)
  });

  if (!putRes.ok) {
    throw new Error(`Failed to update baseline_weight (status ${putRes.status})`);
  }
}

//to get weight data
export async function getTempData(req, res) {
  let baselineWeight = await getOrCreateBaselineWeight();
  const listUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CF_KV_NAMESPACE_ID}/keys?prefix=sensor:`;

  const list = await fetch(listUrl, {
    headers: getAuthHeaders()
  }).then(r => r.json());

  const keys = list.result
    .map((k) => k.name)
    .sort()
    .slice(-MAX_TIMESTAMPS);

  // Fetch each entry
  const values = await Promise.all(
    keys.map(async (key) => {
      const url = getKvValueUrl(key);
      const val = await fetch(url, {
        headers: getAuthHeaders()
      }).then(r => r.json());
      return val;
    })
  );

  // Sort by time
  values.sort((a, b) => new Date(a.time) - new Date(b.time));
  const latestWeight = values.length > 0 ? Number(values[values.length - 1].weight) : 0;

  if (latestWeight > 0 && baselineWeight > 0) {
    const relativeDifference = Math.abs(latestWeight - baselineWeight) / baselineWeight;
    if (relativeDifference > BASELINE_UPDATE_THRESHOLD) {
      await setBaselineWeight(latestWeight);
      baselineWeight = latestWeight;
    }
  }

  console.log(`Baseline weight is now ${baselineWeight} lbs`);

  const capacityFilled = baselineWeight > 0
    ? (latestWeight / baselineWeight) * 100
    : 0;

  res.json({
    baseline_weight: baselineWeight,
    capacity_filled: Number(capacityFilled.toFixed(2)),
    data: values
  });
}