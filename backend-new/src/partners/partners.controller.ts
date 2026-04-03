import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { RequestWithAuth } from '../auth/interfaces/request-with-auth.interface';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { PartnersService } from './partners.service';
import { UpsertCustomerDto } from './dto/upsert-customer.dto';
import { UpsertSupplierDto } from './dto/upsert-supplier.dto';

@Controller('api')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get('customers')
  listCustomers(@Query() query: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.partnersService.listCustomers(query);
  }

  @Post('customers')
  @RequirePermissions('customers')
  createCustomer(@Body() payload: UpsertCustomerDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.partnersService.createCustomer(payload, req.authContext!);
  }

  @Put('customers/:id')
  @RequirePermissions('customers')
  updateCustomer(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpsertCustomerDto,
    @Req() req: RequestWithAuth,
  ): Promise<Record<string, unknown>> {
    return this.partnersService.updateCustomer(id, payload, req.authContext!);
  }

  @Delete('customers/:id')
  @RequirePermissions('canDelete')
  deleteCustomer(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.partnersService.deleteCustomer(id, req.authContext!);
  }

  @Get('suppliers')
  listSuppliers(@Query() query: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.partnersService.listSuppliers(query);
  }

  @Post('suppliers')
  @RequirePermissions('suppliers')
  createSupplier(@Body() payload: UpsertSupplierDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.partnersService.createSupplier(payload, req.authContext!);
  }

  @Put('suppliers/:id')
  @RequirePermissions('suppliers')
  updateSupplier(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpsertSupplierDto,
    @Req() req: RequestWithAuth,
  ): Promise<Record<string, unknown>> {
    return this.partnersService.updateSupplier(id, payload, req.authContext!);
  }

  @Delete('suppliers/:id')
  @RequirePermissions('canDelete')
  deleteSupplier(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.partnersService.deleteSupplier(id, req.authContext!);
  }
}
