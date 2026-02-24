import { IsArray, IsNumber, IsObject, IsOptional } from 'class-validator';

class WorkspaceCanvasViewportDto {
  @IsNumber()
  x!: number;

  @IsNumber()
  y!: number;

  @IsNumber()
  zoom!: number;
}

export class UpdateWorkspaceCanvasDto {
  @IsArray()
  nodes!: Record<string, unknown>[];

  @IsArray()
  edges!: Record<string, unknown>[];

  @IsObject()
  @IsOptional()
  viewport?: WorkspaceCanvasViewportDto;
}
