import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";

import jobsRoutes from "./routes/jobs.routes";
import applicationsRoutes from "./routes/applications.routes";
import candidateRoutes from "./routes/candidate.routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Serve captured screenshots statically as a convenience for direct
// image access (the API also exposes GET /:jobId/screenshot).
app.use(
  "/screenshots",
  express.static(path.resolve(__dirname, "../", process.env.SCREENSHOTS_DIR || "../screenshots"))
);

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/jobs", jobsRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/candidate", candidateRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Job automation backend running on http://localhost:${PORT}`);
});
