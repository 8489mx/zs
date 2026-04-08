import { Injectable } from '@nestjs/common';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { CreateCustomerPaymentDto, CreateSupplierPaymentDto } from './dto/create-party-payment.dto';
import { UpsertPurchaseDto } from './dto/upsert-purchase.dto';
import { PurchasesQueryService } from './services/purchases-query.service';
import { PurchasesWriteService } from './services/purchases-write.service';

@Injectable()
export class PurchasesService {
  constructor(
    private readonly queryService: PurchasesQueryService,
    private readonly writeService: PurchasesWriteService,
  ) {}

  listPurchases(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    return this.queryService.listPurchases(query, auth);
  }

  createPurchase(payload: UpsertPurchaseDto, auth: AuthContext): Promise<Record<string, unknown>> {
    return this.writeService.createPurchase(payload, auth);
  }

  updatePurchase(purchaseId: number, payload: UpsertPurchaseDto, auth: AuthContext): Promise<Record<string, unknown>> {
    return this.writeService.updatePurchase(purchaseId, payload, auth);
  }

  cancelPurchase(purchaseId: number, reason: string, auth: AuthContext): Promise<Record<string, unknown>> {
    return this.writeService.cancelPurchase(purchaseId, reason, auth);
  }

  listSupplierPayments(auth: AuthContext): Promise<Record<string, unknown>> {
    return this.queryService.listSupplierPayments(auth);
  }

  createSupplierPayment(payload: CreateSupplierPaymentDto, auth: AuthContext): Promise<Record<string, unknown>> {
    return this.writeService.createSupplierPayment(payload, auth);
  }

  createCustomerPayment(payload: CreateCustomerPaymentDto, auth: AuthContext): Promise<Record<string, unknown>> {
    return this.writeService.createCustomerPayment(payload, auth);
  }
}
