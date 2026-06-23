import { Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class PaginationDto {
  @ApiProperty({ required: false, default: 1, minimum: 1 })
  page?: number = 1;

  @ApiProperty({ required: false, default: 20, minimum: 1, maximum: 100 })
  limit?: number = 20;

  @ApiProperty({ required: false })
  sortBy?: string;

  @ApiProperty({ required: false, enum: ['asc', 'desc'] })
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export function createPaginationDto(): Type<PaginationDto> {
  return PaginationDto;
}
