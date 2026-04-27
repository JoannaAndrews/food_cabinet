import mqtt from "mqtt";
import fs from 'fs';
import path from "path";
import { kvPut } from "../utils/kv.js";

import dotenv from "dotenv";
dotenv.config();

export const connectMQTT = (io) => {

  const appId = "lab3-app-mad";
  const username = `${appId}@ttn`;
  const password = process.env.MQTT_KEY;

  const client = mqtt.connect("mqtts://nam1.cloud.thethings.network:8883", {
    username, password
  });

  client.on("connect", () => {
    console.log("Connected to TTN MQTT");
    client.subscribe(`v3/${appId}@ttn/devices/+/up`);
  });

  client.on("message", async (topic, message) => {
    const payload = JSON.parse(message.toString());
    // console.log("Uplink:", payload);

    const decoded = payload?.uplink_message?.decoded_payload;

    if (!decoded || typeof decoded.weight != "number") {
      return;
    }

    //update data.json by adding new weight entry
    const entry = {
      time: new Date(payload.received_at).toISOString(),
      weight: payload.uplink_message.decoded_payload.weight
    };

    // Use timestamp as key
    const key = `sensor:${entry.time}`;

    // 1 hour TTL = 3600 seconds
    await kvPut(key, entry, 3600);

    //sending to frontend!
    io.emit("uplink", payload);
  });

}



