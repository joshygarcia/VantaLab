import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { SPACE_PROTECTIONS } from './create-custom-space.dto';
import { FEATURED_TEMPLATE_KEYS } from '../template-canvas-registry';

export class CreateSpaceFromTemplateDto {
  @IsString()
  @IsIn(FEATURED_TEMPLATE_KEYS)
  templateKey!: (typeof FEATURED_TEMPLATE_KEYS)[number];

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(140)
  description?: string;

  @IsString()
  @IsIn(SPACE_PROTECTIONS)
  protection!: (typeof SPACE_PROTECTIONS)[number];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sharedWorkspaceIds?: string[];
}
