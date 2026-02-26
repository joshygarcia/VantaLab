import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { JwtAuthGuard, AuthenticatedRequest } from '../auth/guards/jwt-auth.guard';
import { UpdateWorkspaceSettingsDto } from './dto/update-workspace.dto';
import { UpdateKlingElementsLibraryDto } from './dto/update-kling-elements-library.dto';
import { UploadWorkspaceFileDto } from './dto/upload-workspace-file.dto';
import { CreateCustomSpaceDto } from './dto/create-custom-space.dto';
import { UpdateCustomSpaceDto } from './dto/update-custom-space.dto';
import { UpdateWorkspaceCanvasDto } from './dto/update-workspace-canvas.dto';

@Controller('api/v1/workspaces')
export class WorkspacesController {
    constructor(private readonly workspacesService: WorkspacesService) { }

    private getAuthenticatedUser(request: AuthenticatedRequest) {
        if (!request.user) {
            throw new UnauthorizedException('Missing authenticated user');
        }

        return request.user;
    }

    @Put(':id/settings')
    @UseGuards(JwtAuthGuard)
    updateSettings(
        @Param('id') id: string,
        @Body() payload: UpdateWorkspaceSettingsDto,
        @Req() request: AuthenticatedRequest
    ) {
        const user = this.getAuthenticatedUser(request);
        return this.workspacesService.updateSettings(id, payload, user.workspaceIds, user.id);
    }

    @Get(':id/canvas')
    @UseGuards(JwtAuthGuard)
    getWorkspaceCanvas(
        @Param('id') id: string,
        @Req() request: AuthenticatedRequest
    ) {
        const user = this.getAuthenticatedUser(request);
        return this.workspacesService.getWorkspaceCanvas(id, user.workspaceIds);
    }

    @Put(':id/canvas')
    @UseGuards(JwtAuthGuard)
    updateWorkspaceCanvas(
        @Param('id') id: string,
        @Body() payload: UpdateWorkspaceCanvasDto,
        @Req() request: AuthenticatedRequest
    ) {
        const user = this.getAuthenticatedUser(request);
        return this.workspacesService.updateWorkspaceCanvas(id, payload, user.workspaceIds, user.id);
    }

    @Get(':id/kling-elements-library')
    @UseGuards(JwtAuthGuard)
    getKlingElementsLibrary(
        @Param('id') id: string,
        @Req() request: AuthenticatedRequest
    ) {
        const user = this.getAuthenticatedUser(request);
        return this.workspacesService.getKlingElementsLibrary(id, user.workspaceIds);
    }

    @Put(':id/kling-elements-library')
    @UseGuards(JwtAuthGuard)
    updateKlingElementsLibrary(
        @Param('id') id: string,
        @Body() payload: UpdateKlingElementsLibraryDto,
        @Req() request: AuthenticatedRequest
    ) {
        const user = this.getAuthenticatedUser(request);
        return this.workspacesService.updateKlingElementsLibrary(id, payload, user.workspaceIds);
    }

    @Post(':id/files/upload')
    @UseGuards(JwtAuthGuard)
    uploadWorkspaceFile(
        @Param('id') id: string,
        @Body() payload: UploadWorkspaceFileDto,
        @Req() request: AuthenticatedRequest
    ) {
        const user = this.getAuthenticatedUser(request);
        return this.workspacesService.uploadWorkspaceFile(id, payload, user.workspaceIds);
    }

    @Get(':id/spaces')
    @UseGuards(JwtAuthGuard)
    listCustomSpaces(
        @Param('id') id: string,
        @Req() request: AuthenticatedRequest
    ) {
        const user = this.getAuthenticatedUser(request);
        return this.workspacesService.listCustomSpaces(id, user.workspaceIds);
    }

    @Post(':id/spaces')
    @UseGuards(JwtAuthGuard)
    createCustomSpace(
        @Param('id') id: string,
        @Body() payload: CreateCustomSpaceDto,
        @Req() request: AuthenticatedRequest
    ) {
        const user = this.getAuthenticatedUser(request);
        return this.workspacesService.createCustomSpace(id, payload, user.workspaceIds, user.id);
    }

    @Delete(':id/spaces/:spaceId')
    @UseGuards(JwtAuthGuard)
    deleteCustomSpace(
        @Param('id') id: string,
        @Param('spaceId') spaceId: string,
        @Req() request: AuthenticatedRequest
    ) {
        const user = this.getAuthenticatedUser(request);
        return this.workspacesService.deleteCustomSpace(id, spaceId, user.workspaceIds);
    }

    @Patch(':id/spaces/:spaceId')
    @UseGuards(JwtAuthGuard)
    updateCustomSpace(
        @Param('id') id: string,
        @Param('spaceId') spaceId: string,
        @Body() payload: UpdateCustomSpaceDto,
        @Req() request: AuthenticatedRequest
    ) {
        const user = this.getAuthenticatedUser(request);
        return this.workspacesService.updateCustomSpace(id, spaceId, payload, user.workspaceIds);
    }
}
