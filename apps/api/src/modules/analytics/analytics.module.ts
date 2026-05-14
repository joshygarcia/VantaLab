import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { DbService } from '../database/db.service';

@Module({
    providers: [DbService],
    controllers: [AnalyticsController],
})
export class AnalyticsModule { }
