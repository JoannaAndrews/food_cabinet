import dotenv from "dotenv";
dotenv.config();

const MAX_TIMESTAMPS = 72;
const BASELINE_KEY = "baseline_weight";
const DEFAULT_BASELINE_WEIGHT = 50;
const MIN_BASELINE_WEIGHT = 25;
const PREV_WEIGHT_THRESHOLD_MULTIPLIER = 1.3;

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
  if (baselineWeight < MIN_BASELINE_WEIGHT) {
    baselineWeight = MIN_BASELINE_WEIGHT;
    await setBaselineWeight(baselineWeight);
  }
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
  const latestEntry = values.length > 0 ? values[values.length - 1] : null;
  const latestWeight = latestEntry ? Number(latestEntry.weight) : 0;
  const prevWeight = values.length > 1 ? Number(values[values.length - 2].weight) : 0;
  const parsedBattery = latestEntry ? Number(latestEntry.battery) : null;
  const batteryPercent = Number.isFinite(parsedBattery) ? parsedBattery : null;

  if (latestWeight > 0 && prevWeight > 0) {
    if (latestWeight > prevWeight * PREV_WEIGHT_THRESHOLD_MULTIPLIER) {
      baselineWeight = Math.max(latestWeight, MIN_BASELINE_WEIGHT);
      await setBaselineWeight(baselineWeight);
    }
  }

  console.log(`Baseline weight is now ${baselineWeight} lbs`);

  const rawCapacityFilled = baselineWeight > 0
    ? (latestWeight / baselineWeight) * 100
    : 0;
  const capacityFilled = Number(
    Math.max(0, Math.min(100, rawCapacityFilled)).toFixed(2)
  );

  res.json({
    baseline_weight: baselineWeight,
    battery_percent: batteryPercent,
    capacity_filled: capacityFilled,
    data: values
  });
}