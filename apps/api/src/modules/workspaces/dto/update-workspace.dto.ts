import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateWorkspaceSettingsDto {
    @IsString()
    @IsNotEmpty()
    kieApiKey!: string;
}
