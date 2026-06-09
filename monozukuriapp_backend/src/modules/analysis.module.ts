import { Module } from '@nestjs/common'
import { AnalysisController } from '../controllers/analysis.controller'
import { AnalysisService } from '../services/analysis.service'
import { AiService } from '../services/ai.service'
import { PrismaService } from '../services/prisma.service'
import { ExportExcelService } from '../services/export-excel.service'
import { AuthModule } from './auth/auth.module'

@Module({
  imports: [AuthModule],
  controllers: [AnalysisController],
  providers: [AnalysisService, AiService, PrismaService, ExportExcelService],
  exports: [AnalysisService]
})
export class AnalysisModule {} 