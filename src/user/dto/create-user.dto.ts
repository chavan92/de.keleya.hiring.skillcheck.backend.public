import { Optional } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsEmail } from 'class-validator';

export class CreateUserDto {
  readonly name: string;

  @IsEmail()
  readonly email: string;

  @Optional()
  @Type(() => Boolean)
  readonly confirmed_email?: boolean;

  readonly password: string;

  @Optional()
  @Type(() => Boolean)
  readonly is_admin?: boolean;
}
