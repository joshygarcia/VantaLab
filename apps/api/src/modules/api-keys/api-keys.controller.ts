import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { Prisma } from '@prisma/client';

@Controller('api/v1/admin/api-keys')
export class ApiKeysController {
    constructor(private readonly apiKeysService: ApiKeysService) { }

    @Post()
    create(@Body() createData: Prisma.ApiKeyCreateInput) {
        return this.apiKeysService.create(createData);
    }

    @Get()
    findAll() {
        return this.apiKeysService.findAll();
    }

    @Patch(':id/status')
    setStatus(
        @Param('id') id: string,
        @Body('isActive') isActive: boolean,
    ) {
        return this.apiKeysService.setStatus(id, isActive);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id: string) {
        return this.apiKeysService.delete(id);
    }
}
