import { IsEmail, IsIn, IsOptional, IsString, Matches, MinLength, MaxLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/, {
    message: 'Password must contain upper, lower, and a number',
  })
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  /** Public registration limited to DONOR | SPONSOR (ADMIN seeded only). */
  @IsIn([UserRole.DONOR, UserRole.SPONSOR])
  role!: UserRole;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @IsOptional()
  @IsString()
  companyDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  website?: string;
}
