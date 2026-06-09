import { Module } from '@nestjs/common';
import { TokenValidationService } from '../../services/token-validation.service';
import { SocketService } from './socket.service';

@Module({
  providers: [TokenValidationService, SocketService],
  exports: [TokenValidationService, SocketService],
})
export class SocketModule {}
