import { ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

export class CreateDevTokenDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsOptional()
  workspaceIds?: string[];
}
