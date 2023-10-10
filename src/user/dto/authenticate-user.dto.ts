import { IsEmail } from 'class-validator';

export class AuthenticateUserDto {
  @IsEmail()
  readonly email: string;
  readonly password: string;
}
