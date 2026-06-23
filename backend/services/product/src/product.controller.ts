import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, Public } from '@adbar/common';
import { PaginationDto } from '@adbar/common';

// DTOs defined inline for completeness
class CreateProductDto {
  name!: string;
  description!: string;
  price!: number;
  currency!: string;
  categoryId!: string;
  sku?: string;
  stock!: number;
  images?: string[];
  tags?: string[];
  variants?: Array<{
    name: string;
    sku: string;
    price: number;
    stock: number;
    attributes: Record<string, string>;
  }>;
  storeId!: string;
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
  status?: string;
}

class UpdateProductDto {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  categoryId?: string;
  sku?: string;
  stock?: number;
  images?: string[];
  tags?: string[];
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
  status?: string;
}

class CreateCategoryDto {
  name!: string;
  description?: string;
  parentId?: string;
  image?: string;
  slug!: string;
  isActive?: boolean;
  sortOrder?: number;
}

class CreateVariantDto {
  productId!: string;
  name!: string;
  sku!: string;
  price!: number;
  stock!: number;
  attributes!: Record<string, string>;
}

class CreateCouponDto {
  code!: string;
  description?: string;
  discountType!: 'percentage' | 'fixed';
  discountValue!: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usedCount?: number;
  startDate!: string;
  endDate!: string;
  isActive?: boolean;
  applicableProducts?: string[];
  applicableCategories?: string[];
}

class ApplyCouponDto {
  couponCode!: string;
  orderAmount!: number;
  productIds!: string[];
}

class UpdateStockDto {
  quantity!: number;
  operation!: 'add' | 'subtract' | 'set';
}

@ApiTags('products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // ========== PRODUCT CRUD ==========

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product' })
  async createProduct(@Body() createProductDto: CreateProductDto, @CurrentUser('id') userId: string) {
    const product = await this.productService.createProduct(createProductDto, userId);
    return { statusCode: HttpStatus.CREATED, data: product, message: 'Product created successfully' };
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all products with pagination and filters' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'storeId', required: false })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'tags', required: false })
  @ApiQuery({ name: 'status', required: false })
  async listProducts(
    @Query() paginationDto: PaginationDto,
    @Query('category') categoryId?: string,
    @Query('storeId') storeId?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('search') search?: string,
    @Query('tags') tags?: string,
    @Query('status') status?: string,
  ) {
    const filters = {
      categoryId,
      storeId,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      search,
      tags: tags ? tags.split(',') : undefined,
      status,
    };
    return this.productService.listProducts(paginationDto, filters);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get product by ID' })
  async getProduct(@Param('id') id: string) {
    const product = await this.productService.getProduct(id);
    return { statusCode: HttpStatus.OK, data: product };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product' })
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser('id') userId: string,
  ) {
    const product = await this.productService.updateProduct(id, updateProductDto, userId);
    return { statusCode: HttpStatus.OK, data: product, message: 'Product updated successfully' };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete product' })
  async deleteProduct(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.productService.deleteProduct(id, userId);
  }

  @Put(':id/stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product stock' })
  async updateStock(@Param('id') id: string, @Body() updateStockDto: UpdateStockDto) {
    const product = await this.productService.updateStock(id, updateStockDto);
    return { statusCode: HttpStatus.OK, data: product, message: 'Stock updated successfully' };
  }

  // ========== CATEGORIES ==========

  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a category' })
  async createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    const category = await this.productService.createCategory(createCategoryDto);
    return { statusCode: HttpStatus.CREATED, data: category, message: 'Category created successfully' };
  }

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'List all categories' })
  async listCategories() {
    const categories = await this.productService.listCategories();
    return { statusCode: HttpStatus.OK, data: categories };
  }

  @Get('categories/tree')
  @Public()
  @ApiOperation({ summary: 'Get category tree (hierarchical)' })
  async getCategoryTree() {
    const tree = await this.productService.getCategoryTree();
    return { statusCode: HttpStatus.OK, data: tree };
  }

  @Get('categories/:id')
  @Public()
  @ApiOperation({ summary: 'Get category by ID' })
  async getCategory(@Param('id') id: string) {
    const category = await this.productService.getCategory(id);
    return { statusCode: HttpStatus.OK, data: category };
  }

  // ========== VARIANTS ==========

  @Post('variants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a product variant' })
  async createVariant(@Body() createVariantDto: CreateVariantDto) {
    const variant = await this.productService.createVariant(createVariantDto);
    return { statusCode: HttpStatus.CREATED, data: variant, message: 'Variant created successfully' };
  }

  @Get(':productId/variants')
  @Public()
  @ApiOperation({ summary: 'Get product variants' })
  async getProductVariants(@Param('productId') productId: string) {
    const variants = await this.productService.getProductVariants(productId);
    return { statusCode: HttpStatus.OK, data: variants };
  }

  // ========== IMAGES ==========

  @Post(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload product image' })
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: any,
  ) {
    const image = await this.productService.uploadImage(id, file);
    return { statusCode: HttpStatus.CREATED, data: image, message: 'Image uploaded successfully' };
  }

  // ========== TAGS ==========

  @Get('tags')
  @Public()
  @ApiOperation({ summary: 'List all tags' })
  async listTags() {
    const tags = await this.productService.listTags();
    return { statusCode: HttpStatus.OK, data: tags };
  }

  // ========== COUPONS ==========

  @Post('coupons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a coupon' })
  async createCoupon(@Body() createCouponDto: CreateCouponDto, @CurrentUser('id') userId: string) {
    const coupon = await this.productService.createCoupon(createCouponDto, userId);
    return { statusCode: HttpStatus.CREATED, data: coupon, message: 'Coupon created successfully' };
  }

  @Post('coupons/apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply a coupon to an order' })
  async applyCoupon(@Body() applyCouponDto: ApplyCouponDto) {
    const result = await this.productService.applyCoupon(applyCouponDto);
    return { statusCode: HttpStatus.OK, data: result };
  }

  @Get('coupons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all coupons' })
  async listCoupons(@CurrentUser('id') userId: string) {
    const coupons = await this.productService.listCoupons(userId);
    return { statusCode: HttpStatus.OK, data: coupons };
  }

  // ========== STORE MANAGEMENT ==========

  @Get('stores/:id')
  @Public()
  @ApiOperation({ summary: 'Get store details' })
  async getStore(@Param('id') id: string) {
    const store = await this.productService.getStore(id);
    return { statusCode: HttpStatus.OK, data: store };
  }

  @Get('stores')
  @Public()
  @ApiOperation({ summary: 'List all stores' })
  async listStores(@Query() paginationDto: PaginationDto) {
    return this.productService.listStores(paginationDto);
  }
}
