import { IsString, IsUrl, MinLength } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto{
    @ApiProperty()
    @IsString()
    @MinLength(3)
    name!: string;

    @ApiProperty()
    @IsUrl()
    upstreamUrl!: string;
}