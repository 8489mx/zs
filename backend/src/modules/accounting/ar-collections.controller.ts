import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { PermissionsGuard } from '../../core/auth/guards/permissions.guard';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { ArCollectionsService } from './services/ar-collections.service';
import {
  ArCollectionsQueryDto,
  CreateCollectionLogDto,
  RecordPromiseToPayDto,
  ToggleCreditBlockDto,
  UpdateDunningLevelDto,
} from './dto/ar-collections.dto';

@Controller('api/accounting/collections')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class ArCollectionsController {
  constructor(private readonly collectionsService: ArCollectionsService) {}

  @Get('overview')
  async getOverview(@Req() req: RequestWithAuth) {
    return this.collectionsService.getOverview(req.auth);
  }

  @Get('cases')
  async getCases(
    @Req() req: RequestWithAuth,
    @Query() query: ArCollectionsQueryDto,
  ) {
    return this.collectionsService.getCases(req.auth, query);
  }

  @Get('cases/:id')
  async getCaseDetails(
    @Req() req: RequestWithAuth,
    @Param('id') id: string,
  ) {
    return this.collectionsService.getCaseDetails(req.auth, id);
  }

  @Post('sync')
  async syncCollections(@Req() req: RequestWithAuth) {
    return this.collectionsService.syncCollections(req.auth);
  }

  @Post('cases/:id/logs')
  async logInteraction(
    @Req() req: RequestWithAuth,
    @Param('id') id: string,
    @Body() dto: CreateCollectionLogDto,
  ) {
    return this.collectionsService.logInteraction(req.auth, id, dto);
  }

  @Post('cases/:id/promise-to-pay')
  async recordPromiseToPay(
    @Req() req: RequestWithAuth,
    @Param('id') id: string,
    @Body() dto: RecordPromiseToPayDto,
  ) {
    return this.collectionsService.recordPromiseToPay(req.auth, id, dto);
  }

  @Post('cases/:id/toggle-credit-block')
  async toggleCreditBlock(
    @Req() req: RequestWithAuth,
    @Param('id') id: string,
    @Body() dto: ToggleCreditBlockDto,
  ) {
    return this.collectionsService.toggleCreditBlock(req.auth, id, dto);
  }

  @Get('dunning-levels')
  async getDunningLevels(@Req() req: RequestWithAuth) {
    return this.collectionsService.getDunningLevels(req.auth);
  }

  @Put('dunning-levels/:id')
  async updateDunningLevel(
    @Req() req: RequestWithAuth,
    @Param('id') id: string,
    @Body() dto: UpdateDunningLevelDto,
  ) {
    return this.collectionsService.updateDunningLevel(req.auth, id, dto);
  }
}
