import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RsvpEventDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
