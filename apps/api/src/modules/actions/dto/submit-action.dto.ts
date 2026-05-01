import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SubmitActionDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;
}
