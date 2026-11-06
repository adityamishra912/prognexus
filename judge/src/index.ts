import "dotenv/config";
import express from "express";
import cors from "cors";
import executeRouter from "./routes/execute.js";
import judgeRouter from "./routes/judge.js";

const app = express();

const PORT = Number(process.env.PORT) || 4000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "apexcode-judge",
  });
});

// Execution routes
app.use("/api/execute", executeRouter);

// New harness-generation route
app.use("/api/judge", judgeRouter);

// Start local Express server
app.listen(PORT, () => {
  console.log(`🚀 ApexCode Judge running on port ${PORT}`);
});

export default app;