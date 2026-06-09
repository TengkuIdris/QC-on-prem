import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Server } from 'socket.io';
import { TokenValidationService } from '../../services/token-validation.service';
import { setupSocketHandlers } from '../../socket';

@Injectable()
export class SocketService implements OnModuleInit, OnModuleDestroy {
  private io: Server | null = null;

  constructor(private readonly tokenValidationService: TokenValidationService) {}

  async onModuleInit() {
    console.log('Socket.IO service initialized (call enableSocketIO after app bootstrap)');
  }

  async onModuleDestroy() {
    if (this.io) {
      this.io.close();
    }
  }

  async enableSocketIO(app: any) {
    try {
      this.io = new Server(app.getHttpServer(), {
        cors: {
          origin: process.env.FRONTEND_URL || "http://localhost:5173",
          methods: ["GET", "POST"],
          credentials: true
        }
      });
      setupSocketHandlers(this.io, this.tokenValidationService);
      console.log('Socket.IO enabled successfully');
      return this.io;
    } catch (error) {
      console.error('Failed to enable Socket.IO:', error);
      return null;
    }
  }

  getIO(): Server | null {
    return this.io;
  }
}
