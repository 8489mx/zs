import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../core/auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../core/auth/guards/permissions.guard';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { CreateCustomerPaymentDto, CreateSupplierPaymentDto } from './dto/create-party-payment.dto';
import { UpsertPurchaseDto } from './dto/upsert-purchase.dto';
import { PurchasesService } from './purchases.service';

@Controller('api')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get('purchases')
  @RequirePermissions('purchases')
  listPurchases(@Query() query: Record<string, unknown>, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.purchasesService.listPurchases(query, req.authContext!);
  }

  @Get('purchases/:id')
  @RequirePermissions('purchases')
  getPurchase(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.purchasesService.getPurchaseById(id, req.authContext!);
  }

  @Post('purchases')
  @RequirePermissions('purchases')
  createPurchase(@Body() payload: UpsertPurchaseDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.purchasesService.createPurchase(payload, req.authContext!);
  }

  @Put('purchases/:id')
  @RequirePermissions('canEditInvoices')
  updatePurchase(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpsertPurchaseDto,
    @Req() req: RequestWithAuth,
  ): Promise<Record<string, unknown>> {
    return this.purchasesService.updatePurchase(id, payload, req.authContext!);
  }

  @Post('purchases/:id/cancel')
  @RequirePermissions('canEditInvoices')
  cancelPurchase(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string },
    @Req() req: RequestWithAuth,
  ): Promise<Record<string, unknown>> {
    return this.purchasesService.cancelPurchase(id, String(body?.reason || ''), req.authContext!);
  }

  @Get('supplier-payments')
  @RequirePermissions('accounts')
  listSupplierPayments(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.purchasesService.listSupplierPayments(req.authContext!);
  }

  @Post('supplier-payments')
  @RequirePermissions('accounts')
  createSupplierPayment(@Body() payload: CreateSupplierPaymentDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.purchasesService.createSupplierPayment(payload, req.authContext!);
  }

  @Post('customer-payments')
  @RequirePermissions('accounts')
  createCustomerPayment(@Body() payload: CreateCustomerPaymentDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.purchasesService.createCustomerPayment(payload, req.authContext!);
  }
}
