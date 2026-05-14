import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DeveloperRoleGuard } from '../auth/guards/developer-role.guard';

@Controller('api/v1/admin/api-keys')
@UseGuards(JwtAuthGuard, DeveloperRoleGuard)
export class ApiKeysController {
    constructor(private readonly apiKeysService: ApiKeysService) { }

    @Post()
    create(@Body() createData: { key: string; provider?: string; isActive?: boolean }) {
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
