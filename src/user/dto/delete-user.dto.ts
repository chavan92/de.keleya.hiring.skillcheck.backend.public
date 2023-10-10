import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class DeleteUserDto {
  @Type(() => Number)
  @IsNumber()
  readonly id: number;
}
