import { Module } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysController } from './api-keys.controller';
import { DbService } from '../database/db.service';

@Module({
    providers: [ApiKeysService, DbService],
    controllers: [ApiKeysController],
    exports: [ApiKeysService],
})
export class ApiKeysModule { }
