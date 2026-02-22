import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';

class KlingLibraryElementDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(['object', 'character', 'animal', 'influencer', 'custom'])
  category!: string;

  @IsString()
  @IsIn(['images', 'video'])
  mode!: 'images' | 'video';

  @ValidateIf((item: KlingLibraryElementDto) => item.mode === 'images')
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  imageUrls?: string[];

  @ValidateIf((item: KlingLibraryElementDto) => item.mode === 'video')
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @IsString({ each: true })
  videoUrls?: string[];
}

export class UpdateKlingElementsLibraryDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KlingLibraryElementDto)
  items!: KlingLibraryElementDto[];
}
