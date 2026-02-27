import {
  ArrayUnique,
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';

class KlingLibraryElementDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  imageUrls!: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ArrayUnique((tag: string) => tag)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(24, { each: true })
  tags?: string[];
}

export class UpdateKlingElementsLibraryDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KlingLibraryElementDto)
  items!: KlingLibraryElementDto[];
}
