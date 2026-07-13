import mongoose from 'mongoose';
import dns from 'dns';

// Force IPv4 first and use public DNS servers to resolve MongoDB SRV records reliably
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  console.warn('⚠️ Could not set custom DNS servers:', e);
}

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || '';

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null, failedAt: 0 };
}

// Only retry MongoDB connection every 10 seconds after a failure (reduced from 60s for serverless)
const RETRY_AFTER_MS = 10_000;

export async function connectDB() {
  if (!MONGODB_URI) {
    console.warn('⚠️ MONGO_URI / MONGODB_URI is not set in environment variables.');
    return null;
  }

  if (cached.conn) {
    return cached.conn;
  }

  // If we recently failed, don't retry — fall through to mock mode immediately
  if (cached.failedAt && Date.now() - cached.failedAt < RETRY_AFTER_MS) {
    return null;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 15000, // Increased for Vercel cold starts
      connectTimeoutMS: 15000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      console.log('✅ MongoDB Connected (Cached)');
      cached.failedAt = 0; // Reset failed state on success
      return mongooseInstance;
    }).catch(err => {
      console.error('❌ MongoDB Connection Error:', err.message);
      console.warn('⚠️ Running server in local mock fallback mode.');
      cached.promise = null; // Reset to allow retry after backoff
      cached.failedAt = Date.now(); // Record failure time
      return null;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
