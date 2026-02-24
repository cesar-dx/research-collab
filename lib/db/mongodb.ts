import mongoose from 'mongoose';

const MONGODB_DB = process.env.MONGODB_DB || 'research-collab';

// Cache the connection across hot-reloads in development (serverless-safe)
let cached = (global as any).mongoose as {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectDB(): Promise<typeof mongoose> {
  const raw = process.env.MONGODB_URI ?? '';
  // Strip any accidental leading characters before the scheme (e.g. tab, =, spaces)
  const idx = raw.indexOf('mongodb');
  const MONGODB_URI = idx > 0 ? raw.substring(idx) : raw;
  if (!MONGODB_URI) throw new Error('Missing MONGODB_URI environment variable');

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
