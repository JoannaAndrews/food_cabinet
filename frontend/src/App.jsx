import { useEffect, useState } from "react";
import './App.css';

import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

//step 1) receive and display data from Feather M0
//step 2) have the received data persist in data.json (data does not reset after refresh)
//step 3) if button has been pressed (or data size has reached a certain pt?), append=False;
// on next uplink, we overwrite data.json

//step 4: once data is reliably stored in data.json, an can be retrieved from there, save it in a var
//step 5: use this data.json file to create charts

function App() {
  const [data, setData] = useState([]);

  useEffect(() => {
    socket.on("uplink", (msg) => {
      setData(prev => [...prev, msg]);
    });
  }, []);

  return (
    <div>
      <h1>Live LoRaWAN Data</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}


export default App
