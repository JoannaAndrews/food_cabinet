import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { connectMQTT } from './config/mqtt.js';
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});


// MIDDLEWARES
app.use(cors());
app.use(express.json());

//MQTT
connectMQTT(io);

const port = 5000;
// app.listen(port, () => {
//   console.log(`Server started on http://localhost:${port}`)
// })
// const port = 5000;
httpServer.listen(port, () => {
  console.log(`Server + Socket.IO running on http://localhost:${port}`);
});