import { IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { SPACE_PROTECTIONS } from './create-custom-space.dto';

export class UpdateCustomSpaceDto {
  @IsString()
  @MaxLength(60)
  @IsOptional()
  name?: string;

  @IsString()
  @MaxLength(140)
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(SPACE_PROTECTIONS)
  @IsOptional()
  protection?: (typeof SPACE_PROTECTIONS)[number];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sharedWorkspaceIds?: string[];
}
