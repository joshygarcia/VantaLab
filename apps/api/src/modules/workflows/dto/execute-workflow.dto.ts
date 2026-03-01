import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  Validate,
  ValidateIf,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidateNested
} from 'class-validator';

@ValidatorConstraint({ name: 'multiPromptRules', async: false })
class MultiPromptRulesConstraint implements ValidatorConstraintInterface {
  validate(value: MultiPromptShotDto[] | undefined, args: ValidationArguments) {
    const params = args.object as WorkflowParametersDto;

    if (!params.multiShots && value === undefined) {
      return true;
    }

    if (!Array.isArray(value) || value.length === 0) {
      return false;
    }

    const totalDuration = value.reduce((sum, shot) => sum + (Number(shot.duration) || 0), 0);
    return totalDuration > 0 && totalDuration <= 15;
  }

  defaultMessage() {
    return 'multiPrompt is required when multiShots is true and total shot duration must be 15 seconds or less';
  }
}

class MultiPromptShotDto {
  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(15)
  duration!: number;
}

class KlingElementDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @IsOptional()
  elementInputUrls?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @IsString({ each: true })
  @IsOptional()
  elementInputVideoUrls?: string[];
}

class WorkflowParametersDto {
  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @IsString()
  @IsOptional()
  characterName?: string;

  @IsString()
  @IsOptional()
  customPrompt?: string;

  @IsObject()
  @IsOptional()
  selections?: Record<string, string>;

  @IsString()
  @IsOptional()
  referenceImageUrl?: string;

  @IsString()
  @IsOptional()
  aspectRatio?: string;

  @IsString()
  @IsOptional()
  resolution?: string;

  @IsString()
  @IsOptional()
  @IsIn(['png', 'jpg'])
  outputFormat?: string;

  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  @IsIn(['3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15'])
  duration?: string;

  @IsString()
  @IsOptional()
  @IsIn(['std', 'pro'])
  mode?: string;

  @IsBoolean()
  @IsOptional()
  sound?: boolean;

  @IsBoolean()
  @IsOptional()
  multiShots?: boolean;

  @ValidateIf((params: WorkflowParametersDto) => params.multiShots === true || params.multiPrompt !== undefined)
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MultiPromptShotDto)
  @Validate(MultiPromptRulesConstraint)
  multiPrompt?: MultiPromptShotDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KlingElementDto)
  @IsOptional()
  klingElements?: KlingElementDto[];
}

export class ExecuteWorkflowDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  nodeId!: string;

  @IsString()
  @IsIn(['veo-3.1', 'nano-banana', 'nano-banana-pro', 'z-image', 'kling-3.0/video', 'character-suite'])
  model!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => WorkflowParametersDto)
  parameters!: WorkflowParametersDto;
}
