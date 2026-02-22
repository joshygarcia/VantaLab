import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { PrismaService } from '../database/prisma.service';

@Module({
    providers: [PrismaService],
    controllers: [AnalyticsController],
})
export class AnalyticsModule { }
