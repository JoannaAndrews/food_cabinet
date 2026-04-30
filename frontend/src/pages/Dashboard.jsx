import { useEffect, useState, useMemo } from "react";
// import './App.css';
import axios from 'axios';

import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

//step 1) receive and display data from Feather M0
//step 2) have the received data persist in data.json (data does not reset after refresh)
//step 3) if button has been pressed (or data size has reached a certain pt?), append=False;
// on next uplink, we overwrite data.json

//step 4: once data is reliably stored in data.json, an can be retrieved from there, save it in a var
//step 5: use this data.json file to create charts

const API_BASE = 'http://localhost:5000';

function Dashboard() {
  const [data, setData] = useState([]);

  // to fetch the temperature data from the server side
  const fetchTempData = async () => {
    try {

      const [dataRes] = await Promise.all([
        axios.get(`${API_BASE}/data`),
      ]);

      setData(dataRes.data);
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


  // get stats data according to time
  const stats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const last30DaysData = data.filter(
      (t) => new Date(t.time) >= thirtyDaysAgo,
    );

    const allTimeData = data;

    return {
      last30DaysData,
      allTimeData
    };
  }, [data]);


  return (
    <div >
      <h1>Live LoRaWAN Data</h1>
      {/* <pre>{JSON.stringify(data, null, 2)}</pre> */}




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
                    {new Date(time).toLocaleDateString()}
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


export default Dashboard
