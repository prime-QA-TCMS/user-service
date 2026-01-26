import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

export const config = {
  get port() {
    return process.env.PORT || 8081;
  },
  get jwtSecret() {
    return process.env.JWT_SECRET || "change-me";
  },
  get mongoUri() {
    return process.env.MONGO_URI || "mongodb://localhost:27017/user-service";
  },
  // Compatibility: include legacy records that may miss fields (e.g., roles without tenant)
  get includeLegacyRoles() {
    return (process.env.INCLUDE_LEGACY_ROLES || "false").toLowerCase() === "true";
  }
};

export const connectDb = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("✅ MongoDB connected");

    // Safely log useful connection details (no secrets)
    const redact = (uri: string) => {
      try {
        // Handle mongodb+srv and mongodb schemes
        const hasAt = uri.includes("@");
        if (!hasAt) return uri;
        const [left, right] = uri.split("@");
        // left like: mongodb://user:pass or mongodb+srv://user:pass
        const schemeSplit = left.split("//");
        if (schemeSplit.length < 2) return `***@${right}`;
        const scheme = schemeSplit[0];
        return `${scheme}//***:***@${right}`;
      } catch {
        return "<redacted>";
      }
    };

    const conn: any = mongoose.connection;
    const dbName: string | undefined = conn?.name;
    const client: any = typeof conn.getClient === "function" ? conn.getClient() : conn?.client;
    const clientOpts: any = client?.options || {};

    let serverVersion: string | undefined;
    let replicaSet: string | undefined;
    try {
      const admin = conn?.db?.admin?.();
      if (admin) {
        const info = await admin.serverInfo().catch(() => undefined);
        serverVersion = info?.version;
        const repl = await admin.replSetGetStatus?.().catch(() => undefined);
        replicaSet = repl?.set;
      }
    } catch {
      // ignore diagnostics failures
    }

    const readPreference = client?.readPreference?.mode || clientOpts?.readPreference?.mode;
    const directConnection = clientOpts?.directConnection;
    const maxPoolSize = clientOpts?.maxPoolSize;
    const retryWrites = clientOpts?.retryWrites;

    console.log("[Mongo] URI:", redact(config.mongoUri));
    console.log("[Mongo] DB:", dbName ?? "unknown");
    console.log("[Mongo] Server:", serverVersion ?? "unknown", replicaSet ? `(rs: ${replicaSet})` : "");
    if (readPreference !== undefined) console.log("[Mongo] ReadPref:", readPreference);
    if (retryWrites !== undefined) console.log("[Mongo] RetryWrites:", retryWrites);
    if (maxPoolSize !== undefined) console.log("[Mongo] MaxPoolSize:", maxPoolSize);
    if (directConnection !== undefined) console.log("[Mongo] DirectConnection:", directConnection);
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
};
