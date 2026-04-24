import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../core/auth/decorators/permissions.decorator';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { PermissionsGuard } from '../../core/auth/guards/permissions.guard';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { CatalogService } from './catalog.service';
import { UpsertCategoryDto } from './dto/upsert-category.dto';
import { UpsertProductDto } from './dto/upsert-product.dto';

@Controller('api')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('categories')
  listCategories(): Promise<Record<string, unknown>> {
    return this.catalogService.listCategories();
  }

  @Post('categories')
  @RequirePermissions('products')
  createCategory(@Body() payload: UpsertCategoryDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.catalogService.createCategory(payload, req.authContext!);
  }

  @Put('categories/:id')
  @RequirePermissions('products')
  updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpsertCategoryDto,
    @Req() req: RequestWithAuth,
  ): Promise<Record<string, unknown>> {
    return this.catalogService.updateCategory(id, payload, req.authContext!);
  }

  @Delete('categories/:id')
  @RequirePermissions('canDelete')
  deleteCategory(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.catalogService.deleteCategory(id, req.authContext!);
  }

  @Get('products')
  listProducts(@Query() query: Record<string, unknown>, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.catalogService.listProducts(query, req.authContext);
  }

  @Get('catalog/pos-products')
  @RequirePermissions('sales')
  listPosProducts(@Query() query: Record<string, unknown>, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.catalogService.listPosProducts(query, req.authContext!);
  }

  @Post('products')
  @RequirePermissions('products')
  createProduct(@Body() payload: UpsertProductDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.catalogService.createProduct(payload, req.authContext!);
  }

  @Put('products/:id')
  @RequirePermissions('products')
  updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpsertProductDto,
    @Req() req: RequestWithAuth,
  ): Promise<Record<string, unknown>> {
    return this.catalogService.updateProduct(id, payload, req.authContext!);
  }

  @Delete('products/:id')
  @RequirePermissions('canDelete')
  deleteProduct(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.catalogService.deleteProduct(id, req.authContext!);
  }
}
