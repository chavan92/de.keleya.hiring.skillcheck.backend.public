import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsNumber, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @Type(() => Number)
  @IsNumber()
  readonly id: number;
  @IsOptional()
  readonly name?: string;
  @IsOptional()
  @IsEmail()
  readonly email?: string;
  @IsOptional()
  readonly password?: string;
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  readonly is_admin?: boolean;
}
