import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@adbar/common';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search products with full-text search, filters, and facets' })
  @ApiQuery({ name: 'q', required: false, description: 'Search query' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'rating', required: false, type: Number })
  @ApiQuery({ name: 'storeId', required: false })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['relevance', 'price_asc', 'price_desc', 'rating', 'newest'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchProducts(
    @Query('q') query?: string,
    @Query('category') category?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('rating') rating?: string,
    @Query('storeId') storeId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.searchService.searchProducts({
      query: query || '',
      category,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      rating: rating ? parseFloat(rating) : undefined,
      storeId,
      sortBy: sortBy || 'relevance',
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });

    return { statusCode: HttpStatus.OK, data: result };
  }

  @Post('index/:productId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Index a product in Elasticsearch' })
  @ApiParam({ name: 'productId', description: 'Product ID to index' })
  async indexProduct(
    @Param('productId') productId: string,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.searchService.indexProduct(productId, userId);
    return { statusCode: HttpStatus.OK, data: result, message: 'Product indexed successfully' };
  }

  @Delete('index/:productId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a product from Elasticsearch index' })
  @ApiParam({ name: 'productId', description: 'Product ID to remove from index' })
  async removeIndex(
    @Param('productId') productId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.searchService.removeIndex(productId, userId);
    return { statusCode: HttpStatus.OK, message: 'Product removed from index' };
  }
}
