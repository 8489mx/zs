import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PharmacyService } from './pharmacy.service';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { UpsertDrugDto } from './dto/upsert-drug.dto';
import { UpsertBatchDto } from './dto/upsert-batch.dto';
import { UpsertPrescriptionDto } from './dto/upsert-prescription.dto';
import { UpsertShortageDto } from './dto/upsert-shortage.dto';
import { UpsertClinicalServiceDto } from './dto/upsert-clinical-service.dto';

@Controller('api/pharmacy')
@UseGuards(SessionAuthGuard)
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  // Dashboard Stats
  @Get('stats')
  getStats(@Req() req: RequestWithAuth) {
    return this.pharmacyService.getDashboardStats(req.authContext!);
  }

  // Drugs & Substitutes
  @Get('drugs')
  listDrugs(
    @Req() req: RequestWithAuth,
    @Query('q') q?: string,
    @Query('activeIngredient') activeIngredient?: string,
    @Query('dosageForm') dosageForm?: string,
    @Query('controlledLevel') controlledLevel?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.pharmacyService.listDrugs(req.authContext!, {
      q,
      activeIngredient,
      dosageForm,
      controlledLevel,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('drugs/substitutes')
  findSubstitutes(
    @Req() req: RequestWithAuth,
    @Query('activeIngredient') activeIngredient: string,
    @Query('strength') strength?: string,
  ) {
    return this.pharmacyService.findSubstitutes(req.authContext!, activeIngredient, strength);
  }

  @Post('drugs')
  upsertDrug(@Req() req: RequestWithAuth, @Body() dto: UpsertDrugDto) {
    return this.pharmacyService.upsertDrug(req.authContext!, dto);
  }

  @Delete('drugs/:id')
  deleteDrug(@Req() req: RequestWithAuth, @Param('id', ParseIntPipe) id: number) {
    return this.pharmacyService.deleteDrug(req.authContext!, id);
  }

  // Batches
  @Get('batches')
  listBatches(
    @Req() req: RequestWithAuth,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.pharmacyService.listBatches(req.authContext!, {
      status,
      q,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Post('batches')
  upsertBatch(@Req() req: RequestWithAuth, @Body() dto: UpsertBatchDto) {
    return this.pharmacyService.upsertBatch(req.authContext!, dto);
  }

  // Prescriptions
  @Get('prescriptions')
  listPrescriptions(
    @Req() req: RequestWithAuth,
    @Query('status') status?: string,
    @Query('insuranceProvider') insuranceProvider?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.pharmacyService.listPrescriptions(req.authContext!, {
      status,
      insuranceProvider,
      q,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Post('prescriptions')
  upsertPrescription(@Req() req: RequestWithAuth, @Body() dto: UpsertPrescriptionDto) {
    return this.pharmacyService.upsertPrescription(req.authContext!, dto);
  }

  // Shortages
  @Get('shortages')
  listShortages(
    @Req() req: RequestWithAuth,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.pharmacyService.listShortages(req.authContext!, {
      status,
      priority,
      q,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Post('shortages')
  upsertShortage(@Req() req: RequestWithAuth, @Body() dto: UpsertShortageDto) {
    return this.pharmacyService.upsertShortage(req.authContext!, dto);
  }

  @Patch('shortages/:id/status')
  updateShortageStatus(
    @Req() req: RequestWithAuth,
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    return this.pharmacyService.updateShortageStatus(req.authContext!, id, status);
  }

  // Clinical Services
  @Get('clinical-services')
  listClinicalServices(@Req() req: RequestWithAuth) {
    return this.pharmacyService.listClinicalServices(req.authContext!);
  }

  @Post('clinical-services')
  createClinicalService(@Req() req: RequestWithAuth, @Body() dto: UpsertClinicalServiceDto) {
    return this.pharmacyService.createClinicalService(req.authContext!, dto);
  }
}
