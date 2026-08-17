import mongoose from "mongoose";

export async function connectDB(): Promise<void> {
  mongoose.set("strictQuery", true);

  const configuredUri = process.env.MONGODB_URI;
  if (configuredUri) {
    await mongoose.connect(configuredUri);
    console.log("MongoDB connected");
    return;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("MONGODB_URI is not set in the environment");
  }

  // No MONGODB_URI configured (typical for a fresh local checkout); spin up an
  // in-memory MongoDB automatically so `npm run dev` works with zero setup.
  // Data does not persist across restarts; set MONGODB_URI for real usage.
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const memoryServer = await MongoMemoryServer.create({ instance: { dbName: "kasedaloan" } });
  const uri = memoryServer.getUri();

  await mongoose.connect(uri);
  console.log("MONGODB_URI not set, started an in-memory MongoDB for local development.");
  console.log("Data will not persist across restarts. Set MONGODB_URI in .env for a real database.");

  process.on("SIGINT", async () => {
    await mongoose.disconnect();
    await memoryServer.stop();
    process.exit(0);
  });
}
