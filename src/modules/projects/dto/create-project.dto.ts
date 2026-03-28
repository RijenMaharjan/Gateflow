import { IsString, IsUrl, MinLength } from "class-validator/types";

export class CreateProjectDto{
    @IsString()
    @MinLength(3)
    name: string;

    @IsUrl()
    upstreamUrl: string;
}