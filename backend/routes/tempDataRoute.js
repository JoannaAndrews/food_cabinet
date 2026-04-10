import express from 'express';

import { getTempData } from "../controllers/TempDataController.js";

const tempDataRouter = express.Router();

tempDataRouter.get("/", getTempData);

export default tempDataRouter;