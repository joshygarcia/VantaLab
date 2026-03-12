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
import { KIE_WORKFLOW_MODELS } from '../kie-model-catalog';

const SUPPORTED_WORKFLOW_MODELS = [...KIE_WORKFLOW_MODELS] as const;

const MOTION_CONTROL_MODEL = 'kling-2.6/motion-control';

const MODE_VALUES_BY_MODEL: Partial<Record<string, string[]>> = {
  'veo-3.1': ['std', 'pro'],
  'kling-3.0/video': ['std', 'pro'],
  'kling-2.6/motion-control': ['720p', '1080p'],
  'grok-imagine/text-to-video': ['fun', 'normal', 'spicy'],
  'grok-imagine/image-to-video': ['fun', 'normal', 'spicy']
};

const DURATION_VALUES_BY_MODEL: Partial<Record<string, string[]>> = {
  'kling-3.0/video': ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15'],
  'kling-2.6/motion-control': [
    '3', '4', '5', '6', '7', '8', '9', '10',
    '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
    '21', '22', '23', '24', '25', '26', '27', '28', '29', '30'
  ],
  'sora-2-text-to-video': ['10', '15'],
  'sora-2-image-to-video': ['10', '15'],
  'grok-imagine/text-to-video': ['6', '10'],
  'grok-imagine/image-to-video': ['6', '10']
};

const RESOLUTION_VALUES_BY_MODEL: Partial<Record<string, string[]>> = {
  'grok-imagine/text-to-video': ['480p', '720p'],
  'grok-imagine/image-to-video': ['480p', '720p']
};

const isAllowedModelSpecificValue = (value: string | undefined, allowedValues?: string[]) => {
  if (value === undefined || allowedValues === undefined) {
    return true;
  }

  return allowedValues.includes(value);
};

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

@ValidatorConstraint({ name: 'motionControlParameters', async: false })
class MotionControlParametersConstraint implements ValidatorConstraintInterface {
  validate(value: WorkflowParametersDto | undefined, args: ValidationArguments) {
    const payload = args.object as ExecuteWorkflowDto;

    if (payload.model !== MOTION_CONTROL_MODEL) {
      return true;
    }

    if (!value) {
      return false;
    }

    const hasReferenceImage = typeof value.referenceImageUrl === 'string' && value.referenceImageUrl.trim().length > 0;
    const hasReferenceVideo = typeof value.referenceVideoUrl === 'string' && value.referenceVideoUrl.trim().length > 0;
    const hasValidOrientation = value.characterOrientation === 'image' || value.characterOrientation === 'video';
    const hasMode = typeof value.mode === 'string' && value.mode.trim().length > 0;

    return hasReferenceImage && hasReferenceVideo && hasValidOrientation && hasMode;
  }

  defaultMessage() {
    return 'referenceImageUrl, referenceVideoUrl, characterOrientation, and mode are required for kling-2.6/motion-control';
  }
}

@ValidatorConstraint({ name: 'modelSpecificWorkflowParameters', async: false })
class ModelSpecificWorkflowParametersConstraint implements ValidatorConstraintInterface {
  validate(value: WorkflowParametersDto | undefined, args: ValidationArguments) {
    const payload = args.object as ExecuteWorkflowDto;

    if (!value) {
      return false;
    }

    return (
      isAllowedModelSpecificValue(value.mode, MODE_VALUES_BY_MODEL[payload.model]) &&
      isAllowedModelSpecificValue(value.duration, DURATION_VALUES_BY_MODEL[payload.model]) &&
      isAllowedModelSpecificValue(value.resolution, RESOLUTION_VALUES_BY_MODEL[payload.model])
    );
  }

  defaultMessage() {
    return 'mode, duration, or resolution contains a value not supported by the selected model';
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

  @IsString()
  @IsOptional()
  @IsIn(['seedream-5', 'nano-banana-2', 'nano-banana-pro'])
  characterImageModel?: string;

  @IsObject()
  @IsOptional()
  selections?: Record<string, string>;

  @IsString()
  @IsOptional()
  referenceImageUrl?: string;

  @IsString()
  @IsOptional()
  referenceVideoUrl?: string;

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
  duration?: string;

  @IsString()
  @IsOptional()
  mode?: string;

  @IsString()
  @IsOptional()
  @IsIn(['image', 'video'])
  characterOrientation?: string;

  @IsString()
  @IsOptional()
  @IsIn(['low', 'high'])
  reasoningEffort?: string;

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
  @IsIn(SUPPORTED_WORKFLOW_MODELS)
  model!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => WorkflowParametersDto)
  @Validate(MotionControlParametersConstraint)
  @Validate(ModelSpecificWorkflowParametersConstraint)
  parameters!: WorkflowParametersDto;
}
