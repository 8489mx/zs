import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { MaritimeFreightService } from './maritime-freight.service';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { CreateMaritimeRfqDto } from './dto/create-rfq.dto';
import { SubmitMaritimeBidDto } from './dto/submit-bid.dto';
import { CreateMaritimeQuotationDto } from './dto/create-quotation.dto';
import { CreateMaritimeJobDto } from './dto/create-job.dto';
import { UpdateMaritimeContainerDto } from './dto/update-container.dto';
import { DcsaMilestoneKey } from './maritime-freight.types';

@Controller(['maritime-freight', 'api/maritime-freight'])
@UseGuards(SessionAuthGuard)
export class MaritimeFreightController {
  constructor(private readonly freightService: MaritimeFreightService) {}

  // 1. Ports Master Data
  @Get('ports')
  async getPorts(@Req() req: RequestWithAuth) {
    return this.freightService.getPorts(req.authContext!);
  }

  @Post('ports')
  async createPort(
    @Body() body: { code: string; nameAr: string; nameEn: string; countryCode: string; countryName: string },
    @Req() req: RequestWithAuth,
  ) {
    return this.freightService.createPort(req.authContext!, body);
  }

  // 2. Shipping Lines Master Data
  @Get('shipping-lines')
  async getShippingLines(@Req() req: RequestWithAuth) {
    return this.freightService.getShippingLines(req.authContext!);
  }

  @Post('shipping-lines')
  async createShippingLine(
    @Body() body: { code: string; nameAr: string; nameEn: string; email?: string; rfqEmail?: string; phone?: string },
    @Req() req: RequestWithAuth,
  ) {
    return this.freightService.createShippingLine(req.authContext!, body);
  }

  // 3. Maritime RFQs
  @Post('rfqs')
  async createRfq(@Body() dto: CreateMaritimeRfqDto, @Req() req: RequestWithAuth) {
    return this.freightService.createRfq(req.authContext!, dto);
  }

  @Get('rfqs')
  async getRfqs(
    @Query('status') status: string,
    @Query('search') search: string,
    @Req() req: RequestWithAuth,
  ) {
    return this.freightService.getRfqs(req.authContext!, { status, search });
  }

  @Get('rfqs/:id')
  async getRfqById(@Param('id') id: string, @Req() req: RequestWithAuth) {
    return this.freightService.getRfqById(req.authContext!, id);
  }

  @Post('rfqs/:id/dispatch-emails')
  async dispatchEmails(@Param('id') id: string, @Req() req: RequestWithAuth) {
    return this.freightService.dispatchRfqEmails(req.authContext!, id);
  }

  // 4. Bids Management
  @Post('bids')
  async submitBid(@Body() dto: SubmitMaritimeBidDto, @Req() req: RequestWithAuth) {
    return this.freightService.submitBid(req.authContext!, dto);
  }

  @Post('bids/:id/award')
  async awardBid(@Param('id') id: string, @Req() req: RequestWithAuth) {
    return this.freightService.awardBid(req.authContext!, id);
  }

  @Post('parse-email-text')
  parseEmailText(@Body('text') text: string) {
    return this.freightService.parseCarrierEmailText(text);
  }

  // 5. Client Quotations
  @Post('quotations')
  async createQuotation(@Body() dto: CreateMaritimeQuotationDto, @Req() req: RequestWithAuth) {
    return this.freightService.createQuotation(req.authContext!, dto);
  }

  @Get('quotations')
  async getQuotations(
    @Query('status') status: string,
    @Query('search') search: string,
    @Req() req: RequestWithAuth,
  ) {
    return this.freightService.getQuotations(req.authContext!, { status, search });
  }

  @Put('quotations/:id/status')
  async updateQuotationStatus(
    @Param('id') id: string,
    @Body('status') status: 'approved' | 'rejected' | 'sent',
    @Req() req: RequestWithAuth,
  ) {
    return this.freightService.updateQuotationStatus(req.authContext!, id, status);
  }

  // 6. Shipment Jobs
  @Post('jobs')
  async createJob(@Body() dto: CreateMaritimeJobDto, @Req() req: RequestWithAuth) {
    return this.freightService.createJob(req.authContext!, dto);
  }

  @Get('jobs')
  async getJobs(
    @Query('status') status: string,
    @Query('search') search: string,
    @Query('milestone') milestone: string,
    @Req() req: RequestWithAuth,
  ) {
    return this.freightService.getJobs(req.authContext!, { status, search, milestone });
  }

  @Get('jobs/:id')
  async getJobById(@Param('id') id: string, @Req() req: RequestWithAuth) {
    return this.freightService.getJobById(req.authContext!, id);
  }

  @Post('jobs/:id/milestones')
  async addMilestone(
    @Param('id') id: string,
    @Body('milestoneKey') milestoneKey: DcsaMilestoneKey,
    @Body('notes') notes: string,
    @Body('location') location: string,
    @Req() req: RequestWithAuth,
  ) {
    return this.freightService.addJobMilestone(req.authContext!, id, milestoneKey, notes, location);
  }

  @Post('jobs/:id/release-do')
  async releaseDeliveryOrder(@Param('id') id: string, @Req() req: RequestWithAuth) {
    return this.freightService.releaseDeliveryOrder(req.authContext!, id);
  }

  // 7. Containers & Demurrage Radar
  @Get('containers')
  async getContainers(
    @Query('overdueOnly') overdueOnly: string,
    @Query('depositHeldOnly') depositHeldOnly: string,
    @Query('search') search: string,
    @Req() req: RequestWithAuth,
  ) {
    return this.freightService.getContainers(req.authContext!, {
      overdueOnly: overdueOnly === 'true',
      depositHeldOnly: depositHeldOnly === 'true',
      search,
    });
  }

  @Put('containers/:id')
  async updateContainer(
    @Param('id') id: string,
    @Body() dto: UpdateMaritimeContainerDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.freightService.updateContainer(req.authContext!, id, dto);
  }
}
