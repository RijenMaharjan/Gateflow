import { IsInt, IsEnum, IsPositive, Max } from "class-validator";
import { RateLimitStrategy } from "@prisma/client";
import { ApiProperty } from "@nestjs/swagger/dist";


export class CreateRateLimitRuleDto {
    @ApiProperty()
    @IsInt()
    @IsPositive()
    @Max(100000) //no meore than 100k sanity cap
    maxRequests!: number;

    @ApiProperty()
    @IsInt()
    @IsPositive()
    @Max(86400) //max window is 24hrs in seconds
    windowSeconds!: number;

    @ApiProperty()
    @IsEnum(RateLimitStrategy)
    strategy!: RateLimitStrategy;
}