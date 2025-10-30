/**
 * In-Memory Frame Storage
 *
 * Stores the latest frame from each camera.
 * For production, replace with Redis for:
 * - Persistence across server restarts
 * - Distributed deployments
 * - Better memory management
 */

interface CameraFrame {
  buffer: Buffer;
  timestamp: Date;
  contentType: string;
  size: number;
}

class FrameStorage {
  private frames: Map<string, CameraFrame> = new Map();
  private readonly MAX_FRAME_AGE_MS = 10000; // 10 seconds

  /**
   * Store a frame for a camera
   */
  setFrame(cameraId: string, buffer: Buffer, contentType: string = 'image/jpeg'): void {
    this.frames.set(cameraId, {
      buffer,
      timestamp: new Date(),
      contentType,
      size: buffer.length,
    });

    // Auto-cleanup old frames
    this.cleanupOldFrames();
  }

  /**
   * Get the latest frame for a camera
   */
  getFrame(cameraId: string): CameraFrame | null {
    const frame = this.frames.get(cameraId);

    if (!frame) {
      return null;
    }

    // Check if frame is too old
    const age = Date.now() - frame.timestamp.getTime();
    if (age > this.MAX_FRAME_AGE_MS) {
      this.frames.delete(cameraId);
      return null;
    }

    return frame;
  }

  /**
   * Check if a camera has a recent frame
   */
  hasFrame(cameraId: string): boolean {
    return this.getFrame(cameraId) !== null;
  }

  /**
   * Get frame age in milliseconds
   */
  getFrameAge(cameraId: string): number | null {
    const frame = this.frames.get(cameraId);
    if (!frame) return null;
    return Date.now() - frame.timestamp.getTime();
  }

  /**
   * Remove old frames
   */
  private cleanupOldFrames(): void {
    const now = Date.now();
    for (const [cameraId, frame] of this.frames.entries()) {
      const age = now - frame.timestamp.getTime();
      if (age > this.MAX_FRAME_AGE_MS) {
        this.frames.delete(cameraId);
      }
    }
  }

  /**
   * Get stats about stored frames
   */
  getStats() {
    return {
      totalFrames: this.frames.size,
      totalMemory: Array.from(this.frames.values()).reduce(
        (sum, frame) => sum + frame.size,
        0
      ),
      cameras: Array.from(this.frames.keys()),
    };
  }

  /**
   * Clear all frames (for testing)
   */
  clear(): void {
    this.frames.clear();
  }
}

// Singleton instance
export const frameStorage = new FrameStorage();

/**
 * Production Implementation with Redis:
 *
 * import { Redis } from '@upstash/redis';
 *
 * const redis = new Redis({
 *   url: process.env.REDIS_URL,
 *   token: process.env.REDIS_TOKEN,
 * });
 *
 * export async function setFrame(cameraId: string, buffer: Buffer) {
 *   await redis.setex(
 *     `camera:${cameraId}:frame`,
 *     10, // TTL 10 seconds
 *     buffer.toString('base64')
 *   );
 * }
 *
 * export async function getFrame(cameraId: string): Promise<Buffer | null> {
 *   const frameData = await redis.get(`camera:${cameraId}:frame`);
 *   if (!frameData) return null;
 *   return Buffer.from(frameData as string, 'base64');
 * }
 */
