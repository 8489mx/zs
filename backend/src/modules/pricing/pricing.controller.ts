import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../core/auth/decorators/permissions.decorator';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { PermissionsGuard } from '../../core/auth/guards/permissions.guard';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { PricingPreviewDto } from './dto/pricing-preview.dto';
import { PricingService } from './pricing.service';

@Controller('api/pricing')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('preview')
  @RequirePermissions('pricingCenterView')
  preview(@Body() payload: PricingPreviewDto): Promise<Record<string, unknown>> {
    return this.pricingService.preview({
      ...payload,
      options: {
        applyToWholeStyleCode: Boolean(payload.options?.applyToWholeStyleCode),
        applyToPricingGroup: Boolean(payload.options?.applyToPricingGroup),
        skipActiveOffers: Boolean(payload.options?.skipActiveOffers),
        skipCustomerPrices: Boolean(payload.options?.skipCustomerPrices),
        skipManualExceptions: Boolean(payload.options?.skipManualExceptions),
      },
    });
  }

  @Post('apply')
  @RequirePermissions('pricingCenterManage')
  apply(@Body() payload: PricingPreviewDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.pricingService.apply({
      ...payload,
      options: {
        applyToWholeStyleCode: Boolean(payload.options?.applyToWholeStyleCode),
        applyToPricingGroup: Boolean(payload.options?.applyToPricingGroup),
        skipActiveOffers: Boolean(payload.options?.skipActiveOffers),
        skipCustomerPrices: Boolean(payload.options?.skipCustomerPrices),
        skipManualExceptions: Boolean(payload.options?.skipManualExceptions),
      },
    }, req.authContext!);
  }

  @Get('runs')
  @RequirePermissions('pricingCenterView')
  listRuns(): Promise<Record<string, unknown>> {
    return this.pricingService.listRuns();
  }

  @Post('runs/:id/undo')
  @RequirePermissions('pricingCenterManage')
  undo(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.pricingService.undo(id, req.authContext!);
  }
}
