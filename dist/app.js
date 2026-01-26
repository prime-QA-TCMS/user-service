import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import swaggerUi from "swagger-ui-express";
import { secureHeaders, requestContext, logger, errorHandler } from "prime-qa-api-common";
import { swaggerSpec } from "./config/swagger.js";
import userRoutes from "./routes/user.routes.js";
import roleRoutes from "./routes/role.routes.js";
import tenantRoutes from "./routes/tenant.routes.js";
import authRoutes from "./routes/auth.routes.js";
export function createApp() {
    const app = express();
    app.use(express.json());
    app.use(cors());
    app.use(secureHeaders);
    app.use(requestContext);
    app.use(logger);
    // API Documentation
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'User Service API Docs'
    }));
    app.get("/health", async (_req, res) => {
        const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
        const memUsage = process.memoryUsage();
        const health = {
            status: dbStatus === "connected" ? "ok" : "degraded",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || "development",
            version: "1.0.0",
            database: {
                status: dbStatus,
                name: mongoose.connection.name || "unknown"
            },
            memory: {
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + "MB",
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + "MB",
                rss: Math.round(memUsage.rss / 1024 / 1024) + "MB"
            }
        };
        res.status(dbStatus === "connected" ? 200 : 503).json(health);
    });
    app.get("/health/live", (_req, res) => {
        res.json({ status: "ok", timestamp: new Date().toISOString() });
    });
    app.get("/health/ready", async (_req, res) => {
        const dbReady = mongoose.connection.readyState === 1;
        if (dbReady) {
            res.json({ status: "ready", timestamp: new Date().toISOString() });
        }
        else {
            res.status(503).json({
                status: "not_ready",
                reason: "database",
                timestamp: new Date().toISOString()
            });
        }
    });
    app.use("/auth", authRoutes);
    app.use("/users", userRoutes);
    app.use("/roles", roleRoutes);
    app.use("/tenants", tenantRoutes);
    app.use((req, res) => {
        res.status(404).json({ success: false, code: "NOT_FOUND", message: "Route not found" });
    });
    app.use(errorHandler);
    return app;
}
