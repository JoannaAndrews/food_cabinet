import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { connectMQTT } from './config/mqtt.js';
import { createServer } from "http";
import { Server } from "socket.io";
import tempDataRouter from './routes/tempDataRoute.js';
import { connectDB } from './utils/db.js';
import userRouter from './routes/userRoute.js';


const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});


// MIDDLEWARES
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//MQTT
connectMQTT(io);

const port = 5000;

//DB
connectDB();

// ROUTES
app.use("/user", userRouter);
app.use("/data", tempDataRouter);

httpServer.listen(port, () => {
  console.log(`Server + Socket.IO running on http://localhost:${port}`);
});