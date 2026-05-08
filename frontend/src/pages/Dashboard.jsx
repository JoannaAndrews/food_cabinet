import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import { io } from "socket.io-client";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "../App.css";

const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000");
const USE_MOCK_DATA = false;
const INTERVAL_MINUTES = 10;
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;
const MOCK_POINTS = 72;
const DEFAULT_BASELINE_WEIGHT = 100;
const TIME_RANGE_TABS = [
  { label: "1H", hours: 1 },
  { label: "6H", hours: 6 },
  { label: "12H", hours: 12 },
];
// const API_BASE = "http://localhost:5000";
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const buildMockData = () => {
  const now = new Date();
  const alignedNow = new Date(Math.floor(now.getTime() / INTERVAL_MS) * INTERVAL_MS);
  const mockData = [];

  for (let i = MOCK_POINTS - 1; i >= 0; i -= 1) {
    const time = new Date(alignedNow.getTime() - i * INTERVAL_MS).toISOString();
    const weight = Number((Math.random() * 100).toFixed(2));
    mockData.push({ time, weight });
  }

  return mockData;
};

const formatChartTime = (value) =>
  new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const formatTooltipTime = (value) =>
  new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-time">{formatTooltipTime(label)}</p>
      <p className="chart-tooltip-value">{Number(payload[0].value).toFixed(1)} lbs</p>
    </div>
  );
};

function Dashboard() {
  const [data, setData] = useState([]);
  const navigate = useNavigate();
  const [capacityFilled, setCapacityFilled] = useState(0);
  const [batteryPercent, setBatteryPercent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedRangeHours, setSelectedRangeHours] = useState(12);

  const currentWeight = data.length > 0 ? Number(data[data.length - 1].weight) : 0;
  const emptyNotifiedRef = useRef(false);

  const getAuthToken = useCallback(() => {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
  }, []);

  //API request
  const handleApiRequest = useCallback(async (method, endpoint, data = null) => {
    const token = getAuthToken();
    console.log("token:", token);
    if (!token) {
      navigate("/login");
      return null;
    }

    try {
      setLoading(true);
      const config = {
        method,
        url: `${API_BASE}${endpoint}`,
        headers: { Authorization: `Bearer ${token}` }
      };
      if (data) config.data = data;
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`${method} request error:`, error);
      if (error.response?.status === 401) {
        navigate("/login");
      }
      throw error;
    } finally {
      setLoading(false);
    }

  }, [getAuthToken, navigate],);

  const handleSendFilledNotification = async () => {
    try {
      const endpoint = "/user/notify";
      const res = await handleApiRequest("post", endpoint, { type: "filled" });
      window.alert(`Notification sent to ${res.notified} subscribers!`);
    } catch (err) {
      console.error("Failed to send notification", err);
      window.alert("Failed to send notification.");
    }
  };

  const fetchTempData = async () => {
    try {
      if (USE_MOCK_DATA) {
        const mockData = buildMockData();
        const latestWeight = mockData.length > 0 ? Number(mockData[mockData.length - 1].weight) : 0;
        const mockCapacityFilled = (latestWeight / DEFAULT_BASELINE_WEIGHT) * 100;
        setCapacityFilled(Number(mockCapacityFilled.toFixed(2)));
        setBatteryPercent(null);
        setData(mockData);
        return;
      }

      const dataRes = await axios.get(`${API_BASE}/data`);
      const payload = dataRes.data;
      const serverData = Array.isArray(payload) ? payload : (payload?.data ?? []);
      const serverBaseline = Array.isArray(payload)
        ? Number(dataRes.headers?.["x-baseline-weight"] ?? DEFAULT_BASELINE_WEIGHT)
        : Number(payload?.baseline_weight ?? DEFAULT_BASELINE_WEIGHT);
      const serverCapacity = Array.isArray(payload)
        ? (() => {
          const latestWeight = serverData.length > 0 ? Number(serverData[serverData.length - 1].weight) : 0;
          return serverBaseline > 0 ? (latestWeight / serverBaseline) * 100 : 0;
        })()
        : Number(payload?.capacity_filled ?? 0);
      const serverBattery = Array.isArray(payload)
        ? null
        : Number(payload?.battery_percent);

      setCapacityFilled(Number.isFinite(serverCapacity) ? serverCapacity : 0);
      setBatteryPercent(Number.isFinite(serverBattery) ? serverBattery : null);
      setData(serverData);
    } catch (err) {
      console.error("Failed to fetch data", err?.response || err.message || err);
    }
  };

  useEffect(() => {
    fetchTempData();
    const onUplink = () => fetchTempData();
    socket.on("uplink", onUplink);
    return () => socket.off("uplink", onUplink);
  }, []);

  useEffect(() => {
    const sendEmptyNotification = async () => {
      try {
        if (capacityFilled <= 5 && capacityFilled > 0 && !emptyNotifiedRef.current) {
          emptyNotifiedRef.current = true;
          const res = await handleApiRequest("post", "/user/notify", { type: "empty" });
          window.alert(`Empty alert sent to ${res.notified} subscribers!`);
        }
        if (capacityFilled > 5) {
          emptyNotifiedRef.current = false;
        }
      } catch (error) {
        console.error("Failed to send empty notification", error);
      }
    };

    sendEmptyNotification();
  }, [capacityFilled]);

  const chartData = useMemo(
    () =>
      data.map((entry) => ({
        time: entry.time,
        weight: Number(entry.weight),
      })),
    [data]
  );
  const filteredChartData = useMemo(() => {
    if (chartData.length === 0) return [];

    const latestTimestamp = new Date(chartData[chartData.length - 1].time).getTime();
    if (!Number.isFinite(latestTimestamp)) return chartData;

    const cutoff = latestTimestamp - selectedRangeHours * 60 * 60 * 1000;
    const filtered = chartData.filter((point) => new Date(point.time).getTime() >= cutoff);

    return filtered.length > 0 ? filtered : [chartData[chartData.length - 1]];
  }, [chartData, selectedRangeHours]);
  const xAxisTicks = useMemo(
    () =>
      filteredChartData
        .filter((_, idx) => idx % 6 === 0 || idx === filteredChartData.length - 1)
        .map((point) => point.time),
    [filteredChartData]
  );

  const capacityBarColor = capacityFilled < 25 ? "#dc2626" : capacityFilled <= 50 ? "#eab308" : "#16a34a";
  const normalizedBatteryPercent =
    batteryPercent == null ? null : Math.max(0, Math.min(100, Number(batteryPercent)));

  return (
    <div className="dashboard-shell">
      <div className="battery-widget" style={{ position: "absolute", top: 0, right: "12px" }}>
        <div className="battery-icon">
          <div
            className="battery-fill"
            style={{ "--battery-fill": `${normalizedBatteryPercent ?? 0}%` }}
          />
        </div>
        <span className="battery-text">
          Battery: {normalizedBatteryPercent == null ? "N/A" : `${normalizedBatteryPercent.toFixed(0)}%`}
        </span>
      </div>
      <h1 className="dashboard-title">Live Food Cabinet Data</h1>
      <h2 className="availability-heading">
        <span className="availability-value">{currentWeight.toFixed(1)} lbs</span>
        <span className="availability-label">food available</span>
      </h2>

      <div className="dashboard-card mb-4 p-3">
        <div className="capacity-header-layout">
          <div className="capacity-bar-wrap" style={{ gridColumn: 2 }}>
            <div className="capacity-label capacity-label-top">Full</div>
            <div className="capacity-bar">
              <div className="capacity-bar-text">{capacityFilled.toFixed(1)}%</div>
              <div
                className="capacity-bar-fill"
                style={{
                  "--capacity-fill": `${Math.max(0, Math.min(capacityFilled, 100))}%`,
                  "--capacity-color": capacityBarColor,
                }}
              />
            </div>
            <div className="capacity-label capacity-label-bottom capacity-food-level-label">Food Level</div>
          </div>
          <div className="capacity-notify-wrap">
            <button
              type="button"
              onClick={handleSendFilledNotification}
              className="filled-notify-button"
            >
              Send filled-cabinet notification
            </button>
          </div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="dashboard-card mb-5 p-4">
          <div className="chart-tabs" role="tablist" aria-label="Weight history time range">
            {TIME_RANGE_TABS.map((tab) => {
              const isActive = selectedRangeHours === tab.hours;
              return (
                <button
                  key={tab.hours}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`chart-tab ${isActive ? "chart-tab-active" : ""}`}
                  onClick={() => setSelectedRangeHours(tab.hours)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="modern-chart-wrap" role="img" aria-label="Weight in pounds over time">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={filteredChartData}
                margin={{ top: 12, right: 12, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="weightAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.34} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="time"
                  ticks={xAxisTicks}
                  tickFormatter={formatChartTime}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 50]}
                  ticks={[0, 12.5, 25, 37.5, 50]}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tickFormatter={(v) => `${Number(v).toFixed(0)}`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#93c5fd", strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fill="url(#weightAreaGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#2563eb", stroke: "#ffffff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <h3 className="chart-caption">
            Weight History (Past {selectedRangeHours} Hours)
          </h3>
        </div>
      )}

    </div>
  );
}

export default Dashboard;
