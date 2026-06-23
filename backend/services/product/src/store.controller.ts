import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StoreService } from './store.service';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, Public } from '@adbar/common';
import { PaginationDto } from '@adbar/common';

class CreateStoreDto {
  name!: string;
  slug!: string;
  description?: string;
  logo?: string;
  banner?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  category?: string;
  tags?: string[];
}

class UpdateStoreDto {
  name?: string;
  description?: string;
  logo?: string;
  banner?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  category?: string;
  tags?: string[];
  isActive?: boolean;
}

@ApiTags('stores')
@Controller('stores')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new store' })
  async createStore(@Body() createStoreDto: CreateStoreDto, @CurrentUser('id') userId: string) {
    const store = await this.storeService.createStore(createStoreDto, userId);
    return { statusCode: HttpStatus.CREATED, data: store, message: 'Store created successfully' };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get store by ID' })
  async getStore(@Param('id') id: string) {
    const store = await this.storeService.getStore(id);
    return { statusCode: HttpStatus.OK, data: store };
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all stores' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  async listStores(
    @Query() paginationDto: PaginationDto,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.storeService.listStores(paginationDto, { category, search });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update store' })
  async updateStore(
    @Param('id') id: string,
    @Body() updateStoreDto: UpdateStoreDto,
    @CurrentUser('id') userId: string,
  ) {
    const store = await this.storeService.updateStore(id, updateStoreDto, userId);
    return { statusCode: HttpStatus.OK, data: store, message: 'Store updated successfully' };
  }

  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Follow/unfollow a store' })
  async followStore(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const result = await this.storeService.toggleFollowStore(id, userId);
    return { statusCode: HttpStatus.OK, data: result };
  }

  @Get(':id/products')
  @Public()
  @ApiOperation({ summary: 'Get store products' })
  async getStoreProducts(@Param('id') id: string, @Query() paginationDto: PaginationDto) {
    return this.storeService.getStoreProducts(id, paginationDto);
  }
}
