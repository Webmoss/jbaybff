import { PartialType } from '@nestjs/mapped-types';
import { CreatePostDto } from './blog.dto';

export class UpdatePostDto extends PartialType(CreatePostDto) {}
