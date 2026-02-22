import { IsNotEmpty, IsOptional, IsString, MaxLength, Matches } from 'class-validator';

export class UploadWorkspaceFileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20_000_000)
  @Matches(/^data:image\//, { message: 'base64Data must be an image data URL' })
  base64Data!: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  fileName?: string;
}
