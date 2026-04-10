import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { connectMQTT } from './config/mqtt.js';
import { createServer } from "http";
import { Server } from "socket.io";
import tempDataRouter from './routes/tempDataRoute.js';


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

app.use("/data", tempDataRouter);

httpServer.listen(port, () => {
  console.log(`Server + Socket.IO running on http://localhost:${port}`);
});