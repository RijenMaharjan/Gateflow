// src/modules/api-keys/dto/create-api-key.dto.ts
import { IsString, IsOptional, IsDateString, MinLength } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @MinLength(3)
  name!: string;

  // optional expiry date — if not provided the key never expires
  // format: ISO 8601 string e.g. "2026-12-31T00:00:00.000Z"
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}