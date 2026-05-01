import { useEffect, useState, useMemo } from "react";
import './App.css';
import axios from 'axios';

import { io } from "socket.io-client";

const socket = io("http://localhost:5000");
const USE_MOCK_DATA = true;
const INTERVAL_MINUTES = 10;
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;
const MOCK_POINTS = 120;
const DEFAULT_BASELINE_WEIGHT = 100;

const buildMockData = () => {
  const now = new Date();
  const alignedNow = new Date(
    Math.floor(now.getTime() / INTERVAL_MS) * INTERVAL_MS
  );
  const mockData = [];

  for (let i = MOCK_POINTS - 1; i >= 0; i -= 1) {
    const time = new Date(alignedNow.getTime() - i * INTERVAL_MS).toISOString();
    const weight = Number((Math.random() * 100).toFixed(2));

    mockData.push({ time, weight });
  }

  return mockData;
};

//step 1) receive and display data from Feather M0
//step 2) have the received data persist in data.json (data does not reset after refresh)
//step 3) if button has been pressed (or data size has reached a certain pt?), append=False;
// on next uplink, we overwrite data.json

//step 4: once data is reliably stored in data.json, an can be retrieved from there, save it in a var
//step 5: use this data.json file to create charts

const API_BASE = 'http://localhost:5000';

function App() {
  const [data, setData] = useState([]);
  const [baselineWeight, setBaselineWeight] = useState(DEFAULT_BASELINE_WEIGHT);
  const [capacityFilled, setCapacityFilled] = useState(0);

  // to fetch the weight data from the server side
  const fetchTempData = async () => {
    try {
      if (USE_MOCK_DATA) {
        const mockData = buildMockData();
        const latestWeight = mockData.length > 0 ? Number(mockData[mockData.length - 1].weight) : 0;
        const mockCapacityFilled = (latestWeight / DEFAULT_BASELINE_WEIGHT) * 100;

        setBaselineWeight(DEFAULT_BASELINE_WEIGHT);
        setCapacityFilled(Number(mockCapacityFilled.toFixed(2)));
        setData(mockData);
        return;
      }

      const [dataRes] = await Promise.all([
        axios.get(`${API_BASE}/data`),
      ]);

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

      setBaselineWeight(Number.isFinite(serverBaseline) ? serverBaseline : DEFAULT_BASELINE_WEIGHT);
      setCapacityFilled(Number.isFinite(serverCapacity) ? serverCapacity : 0);
      setData(serverData);
      // setLastUpdated(new Date());

    } catch (err) {
      console.error(
        "Failed to fetch data",
        err?.response || err.message || err
      );
    }
  };

  useEffect(() => {
    fetchTempData();
    // socket.on("uplink", (msg) => {
    //   fetchTempData();
    // });
  }, []);


  const chartData = useMemo(() => {
    if (data.length === 0) return null;

    const width = 780;
    const height = 260;
    const padding = { top: 20, right: 20, bottom: 36, left: 52 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const minWeight = 0;
    const maxWeight = 100;
    const weightRange = maxWeight - minWeight;

    const points = data.map((d, idx) => {
      const clampedWeight = Math.max(minWeight, Math.min(maxWeight, Number(d.weight)));
      const x = padding.left + (idx / Math.max(data.length - 1, 1)) * innerWidth;
      const y = padding.top + ((maxWeight - clampedWeight) / weightRange) * innerHeight;
      return { x, y, time: d.time };
    });

    const path = points
      .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");
    const areaPath = `${path} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;

    const yTicks = Array.from({ length: 5 }, (_, i) => {
      const value = minWeight + (weightRange * i) / 4;
      const y = padding.top + innerHeight - (innerHeight * i) / 4;
      return { value, y };
    });

    const xTicks = points
      .map((point, idx) => ({
        x: point.x,
        label: new Date(data[idx].time).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        isHourMark: idx % 6 === 0 || idx === points.length - 1,
      }))
      .filter((tick) => tick.isHourMark);

    return { width, height, padding, points, path, areaPath, yTicks, xTicks };
  }, [data]);

  const capacityBarColor = capacityFilled < 25
    ? "#dc2626"
    : capacityFilled <= 50
      ? "#eab308"
      : "#16a34a";


  return (
    <div>
      <h1>Live LoRaWAN Data</h1>
      {/* <pre>{JSON.stringify(data, null, 2)}</pre> */}

      <div className="mb-4 rounded-xl border border-gray-100 p-3">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
          }}
        >
          <div className="capacity-bar-wrap" style={{ gridColumn: 2 }}>
            <div className="capacity-label capacity-label-top">
              Full
            </div>
            <div className="capacity-bar">
              <div
                className="capacity-bar-fill"
                style={{
                  "--capacity-fill": `${Math.max(0, Math.min(capacityFilled, 100))}%`,
                  "--capacity-color": capacityBarColor,
                }}
              />
            </div>
            <div className="capacity-label capacity-label-bottom">
              Empty
            </div>
          </div>
          <div
            className="text-lg font-semibold text-slate-700"
            style={{ gridColumn: 3, justifySelf: "start", marginLeft: "12px" }}
          >
            {capacityFilled.toFixed(1)}% Filled
          </div>
        </div>
      </div>




      {chartData && (
        <div className="mb-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <svg
            viewBox={`0 0 ${chartData.width} ${chartData.height}`}
            className="h-[260px] min-w-[760px] w-full"
            role="img"
            aria-label="Weight in pounds over time"
          >
            <defs>
              <linearGradient id="weightAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            <rect
              x={chartData.padding.left}
              y={chartData.padding.top}
              width={chartData.width - chartData.padding.left - chartData.padding.right}
              height={chartData.height - chartData.padding.top - chartData.padding.bottom}
              fill="#f8fafc"
              rx="12"
            />
            <line x1={chartData.padding.left} y1={chartData.padding.top} x2={chartData.padding.left} y2={chartData.height - chartData.padding.bottom} stroke="#cbd5e1" strokeWidth="1.5" />
            <line x1={chartData.padding.left} y1={chartData.height - chartData.padding.bottom} x2={chartData.width - chartData.padding.right} y2={chartData.height - chartData.padding.bottom} stroke="#cbd5e1" strokeWidth="1.5" />
            {chartData.yTicks.map((tick) => (
              <g key={tick.y}>
                <line x1={chartData.padding.left} y1={tick.y} x2={chartData.width - chartData.padding.right} y2={tick.y} stroke="#e2e8f0" />
                <text x={chartData.padding.left - 12} y={tick.y + 4} textAnchor="end" fontSize="11" fill="#64748b">{tick.value.toFixed(1)}</text>
              </g>
            ))}
            {chartData.xTicks.map((tick, idx) => (
              <g key={`${tick.x}-${idx}`}>
                <line
                  x1={tick.x}
                  y1={chartData.height - chartData.padding.bottom}
                  x2={tick.x}
                  y2={chartData.height - chartData.padding.bottom + 5}
                  stroke="#94a3b8"
                />
                <text
                  x={tick.x}
                  y={chartData.height - chartData.padding.bottom + 16}
                  textAnchor="middle"
                    fontSize="10"
                  fill="#64748b"
                >
                  {tick.label}
                </text>
              </g>
            ))}
            <path d={chartData.areaPath} fill="url(#weightAreaGradient)" />
            <path d={chartData.path} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {chartData.points
              .filter((_, idx) => idx % 6 === 0 || idx === chartData.points.length - 1)
              .map((p) => <circle key={p.time} cx={p.x} cy={p.y} r="3.5" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />)}
            <text x={14} y={18} fontSize="12" fill="#334155">Weight (lbs)</text>
          </svg>
        </div>
      )}

      <div className=" space-y-4 max-h-[500px] -mx-5 overflow-y-auto pr-2">
        {data.map((data_item) => {
          const { weight, time } = data_item;
          return (
            <div key={time} className="flex items-center lg:flex-col xl:flex-row md:flex-row justify-between p-1 -mx-0 lg:p-4 md:p-4 hover:bg-gray-50 rounded-xl transition-all duration-300 border border-gray-100">
              <div className=" flex items-center gap-1 md:gap-4 lg:gap-3">

                <div >
                  <p >
                    {weight}
                  </p>

                  <p >
                    {new Date(time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </p>
                </div>

              </div>
            </div>
          );
        })}

        {data.length === 0 && (<div>
          <p>
            No recent data
          </p>
        </div>)}

      </div>


    </div>
  );
}


export default App
