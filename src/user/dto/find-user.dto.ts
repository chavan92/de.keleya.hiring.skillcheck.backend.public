import { IsNumber, IsBoolean, IsOptional, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';

export class FindUserDto {
  @IsOptional()
  @Type(() => Number)
  readonly id?: number[];

  @IsOptional()
  readonly name?: string;

  @IsOptional()
  @IsEmail()
  readonly email?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  readonly limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  readonly offset?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  readonly credentials?: boolean;

  @IsOptional()
  @Type(() => Date)
  readonly updated_since?: Date;
}
