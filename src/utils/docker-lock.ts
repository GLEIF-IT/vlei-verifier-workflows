export class DockerLock {
  private static instance: DockerLock;
  private lock: boolean = false;
  private queue: (() => void)[] = [];
  private serviceReferenceCount: Map<string, number> = new Map();
  private timeouts: NodeJS.Timeout[] = [];

  private constructor() {
    console.log('DockerLock instance created');
  }

  static getInstance(): DockerLock {
    if (!DockerLock.instance) {
      DockerLock.instance = new DockerLock();
    }
    return DockerLock.instance;
  }

  async acquire(): Promise<void> {
    console.log('DockerLock: Attempting to acquire lock. Current state:', {
      isLocked: this.lock,
      queueLength: this.queue.length
    });

    if (!this.lock) {
      console.log('DockerLock: Lock acquired immediately');
      this.lock = true;
      return;
    }

    console.log('DockerLock: Lock is busy, adding to queue');
    return new Promise((resolve) => {
      this.queue.push(() => {
        console.log('DockerLock: Queue callback executing');
        resolve();
      });
    });
  }

  release(): void {
    console.log('DockerLock: Releasing lock. Queue length:', this.queue.length);
    
    // Clear any pending timeouts
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts = [];
    
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      console.log('DockerLock: Executing next queued operation');
      next?.();
    } else {
      console.log('DockerLock: No queued operations, releasing lock');
      this.lock = false;
    }
  }

  // Add method to force release the lock and clear queue
  forceRelease(): void {
    console.log('DockerLock: Force releasing lock and clearing queue');
    this.lock = false;
    this.queue = [];
  }

  getLockStatus(): boolean {
    return this.lock;
  }

  cleanup(): void {
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts = [];
    this.queue = [];
    this.lock = false;
  }

  async acquireForService(serviceName: string): Promise<void> {
    await this.acquire();
    const count = this.serviceReferenceCount.get(serviceName) || 0;
    this.serviceReferenceCount.set(serviceName, count + 1);
    console.log(`DockerLock: Service ${serviceName} reference count: ${count + 1}`);
    this.release();
  }

  async releaseService(serviceName: string): Promise<boolean> {
    await this.acquire();
    const count = this.serviceReferenceCount.get(serviceName) || 0;
    if (count <= 0) {
      console.log(`DockerLock: Service ${serviceName} is not running`);
      this.release();
      return false;
    }

    const newCount = count - 1;
    this.serviceReferenceCount.set(serviceName, newCount);
    console.log(`DockerLock: Service ${serviceName} reference count: ${newCount}`);
    
    const shouldStop = newCount === 0;
    this.release();
    return shouldStop;
  }

  isServiceRunning(serviceName: string): boolean {
    return (this.serviceReferenceCount.get(serviceName) || 0) > 0;
  }
} 