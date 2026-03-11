import mqtt from "mqtt";
import fs from 'fs';

export const connectMQTT = (io) => {

  const appId = "joanna-test-application";
  const username = `${appId}@ttn`;
  const password = "NNSXS.QDONRCUAHF5KCNMQKO6PGLKGYJR5QLGPNW5TZMQ.ARWRQ332TVEYVZBEPOGXTMA2L5RETZP6ADLV6YEYJLY5KBXQSTVQ";

  const client = mqtt.connect("mqtts://nam1.cloud.thethings.network:8883", {
    username, password
  });

  client.on("connect", () => {
    console.log("Connected to TTN MQTT");
    client.subscribe(`v3/${appId}@ttn/devices/+/up`);
  });

  client.on("message", (topic, message) => {
    const payload = JSON.parse(message.toString());
    console.log("Uplink:", payload);

    //sending to frontend!
    io.emit("uplink", payload);
  });

}



