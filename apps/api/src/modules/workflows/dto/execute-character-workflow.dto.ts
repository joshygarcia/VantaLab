import { Type } from 'class-transformer';
import { IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

class CharacterSelectionsDto {
  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  ethnicity?: string;

  @IsString()
  @IsOptional()
  eyeColor?: string;

  @IsString()
  @IsOptional()
  skinCondition?: string;

  @IsString()
  @IsOptional()
  ageRange?: string;

  @IsString()
  @IsOptional()
  hairStyle?: string;

  @IsString()
  @IsOptional()
  bodyType?: string;

  @IsString()
  @IsOptional()
  renderStyle?: string;
}

export class ExecuteCharacterWorkflowDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  nodeId!: string;

  @IsString()
  @IsOptional()
  characterName?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => CharacterSelectionsDto)
  selections!: CharacterSelectionsDto;

  @IsString()
  @IsOptional()
  customPrompt?: string;

  @IsString()
  @IsOptional()
  aspectRatio?: string;

  @IsString()
  @IsOptional()
  resolution?: string;
}
