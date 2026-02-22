import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export const SPACE_PROTECTIONS = ['standard', 'template-only', 'locked', 'team-shared'] as const;
export type SpaceProtection = (typeof SPACE_PROTECTIONS)[number];

export class CreateCustomSpaceDto {
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
  @IsOptional()
  protection?: SpaceProtection;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sharedWorkspaceIds?: string[];
}
