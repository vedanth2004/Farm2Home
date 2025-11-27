/**
 * Background Job Queue System
 * Simple in-memory queue for background tasks (can be upgraded to BullMQ/Redis later)
 */

interface Job<T = any> {
  id: string;
  type: string;
  data: T;
  priority: number;
  createdAt: Date;
  retries: number;
  maxRetries: number;
}

class JobQueue {
  private queue: Job[] = [];
  private processing = false;
  private workers: Map<string, (data: any) => Promise<void>> = new Map();

  /**
   * Register a job handler
   */
  register(type: string, handler: (data: any) => Promise<void>) {
    this.workers.set(type, handler);
  }

  /**
   * Add a job to the queue
   */
  async add<T>(
    type: string,
    data: T,
    options?: { priority?: number; maxRetries?: number },
  ): Promise<string> {
    const job: Job<T> = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      priority: options?.priority || 0,
      createdAt: new Date(),
      retries: 0,
      maxRetries: options?.maxRetries || 3,
    };

    // Insert by priority
    const insertIndex = this.queue.findIndex((j) => j.priority < job.priority);
    if (insertIndex === -1) {
      this.queue.push(job);
    } else {
      this.queue.splice(insertIndex, 0, job);
    }

    // Start processing if not already running
    if (!this.processing) {
      this.process();
    }

    return job.id;
  }

  /**
   * Process jobs from the queue
   */
  private async process() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      const handler = this.workers.get(job.type);

      if (!handler) {
        console.warn(`No handler registered for job type: ${job.type}`);
        continue;
      }

      try {
        await handler(job.data);
        console.log(`✅ Job ${job.id} (${job.type}) completed successfully`);
      } catch (error) {
        console.error(`❌ Job ${job.id} (${job.type}) failed:`, error);

        // Retry if retries remaining
        if (job.retries < job.maxRetries) {
          job.retries++;
          // Add back to queue with lower priority
          job.priority -= 1;
          this.queue.push(job);
          console.log(
            `🔄 Retrying job ${job.id} (attempt ${job.retries}/${job.maxRetries})`,
          );
        } else {
          console.error(`❌ Job ${job.id} exceeded max retries, discarding`);
        }
      }

      // Small delay between jobs
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.processing = false;
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      registeredTypes: Array.from(this.workers.keys()),
    };
  }
}

// Singleton instance
export const jobQueue = new JobQueue();

/**
 * Pre-configure common job handlers
 */
export function setupJobHandlers() {
  // Order notification handler
  jobQueue.register("ORDER_NOTIFICATION", async (data: any) => {
    const { prisma } = await import("@/lib/prisma");
    await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type || "ORDER_UPDATE",
        channel: "INAPP",
        payload: data.payload || {},
      },
    });
  });

  // Email notification handler (placeholder)
  jobQueue.register("SEND_EMAIL", async (data: any) => {
    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`📧 Would send email to ${data.to}: ${data.subject}`);
  });

  // Inventory sync handler
  jobQueue.register("SYNC_INVENTORY", async (data: any) => {
    const { prisma } = await import("@/lib/prisma");
    // Sync inventory across different systems if needed
    console.log(`📦 Syncing inventory for listing ${data.listingId}`);
  });

  // Analytics update handler
  jobQueue.register("UPDATE_ANALYTICS", async (data: any) => {
    // Update analytics/cache in background
    const { cache } = await import("@/lib/cache");
    const { cacheKeys } = await import("@/lib/cache");
    // Invalidate relevant caches
    cache.delete(cacheKeys.metrics("all"));
    cache.delete(cacheKeys.metrics("today"));
    console.log(`📊 Analytics cache invalidated for ${data.entityType}`);
  });
}

// Setup handlers on module load
if (typeof window === "undefined") {
  // Only run on server
  setupJobHandlers();
}
