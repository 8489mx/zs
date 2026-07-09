import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AllowAuthenticated, RequirePermissions } from '../../core/auth/decorators/permissions.decorator';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { PermissionsGuard } from '../../core/auth/guards/permissions.guard';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { PartnersService } from './partners.service';
import { UpsertCustomerDto } from './dto/upsert-customer.dto';
import { UpsertSupplierDto } from './dto/upsert-supplier.dto';
import { UpsertContactDto } from './dto/upsert-contact.dto';
import { UpsertAddressDto } from './dto/upsert-address.dto';

@Controller('api')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get('customers')
  @RequirePermissions('customers')
  listCustomers(@Query() query: Record<string, unknown>, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.partnersService.listCustomers(query, req.authContext!);
  }

  @Post('customers')
  @RequirePermissions('customers')
  createCustomer(@Body() payload: UpsertCustomerDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.partnersService.createCustomer(payload, req.authContext!);
  }

  @Get('customers/:id/pos-summary')
  @RequirePermissions('customers')
  getCustomerPosSummary(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.partnersService.getCustomerPosSummary(id, req.authContext!);
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
  @RequirePermissions('suppliers')
  listSuppliers(@Query() query: Record<string, unknown>, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.partnersService.listSuppliers(query, req.authContext!);
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

  @Get(':partnerType/:partnerId/contacts')
  @AllowAuthenticated()
  listContacts(
    @Param('partnerType') partnerType: string,
    @Param('partnerId', ParseIntPipe) partnerId: number,
    @Req() req: RequestWithAuth,
  ): Promise<Record<string, unknown>> {
    return this.partnersService.listContacts(partnerType, partnerId, req.authContext!);
  }

  @Post(':partnerType/:partnerId/contacts')
  @AllowAuthenticated()
  createContact(
    @Param('partnerType') partnerType: string,
    @Param('partnerId', ParseIntPipe) partnerId: number,
    @Body() payload: UpsertContactDto,
    @Req() req: RequestWithAuth,
  ): Promise<Record<string, unknown>> {
    return this.partnersService.createContact(partnerType, partnerId, payload, req.authContext!);
  }

  @Get(':partnerType/:partnerId/addresses')
  @AllowAuthenticated()
  listAddresses(
    @Param('partnerType') partnerType: string,
    @Param('partnerId', ParseIntPipe) partnerId: number,
    @Req() req: RequestWithAuth,
  ): Promise<Record<string, unknown>> {
    return this.partnersService.listAddresses(partnerType, partnerId, req.authContext!);
  }

  @Post(':partnerType/:partnerId/addresses')
  @AllowAuthenticated()
  createAddress(
    @Param('partnerType') partnerType: string,
    @Param('partnerId', ParseIntPipe) partnerId: number,
    @Body() payload: UpsertAddressDto,
    @Req() req: RequestWithAuth,
  ): Promise<Record<string, unknown>> {
    return this.partnersService.createAddress(partnerType, partnerId, payload, req.authContext!);
  }
}

