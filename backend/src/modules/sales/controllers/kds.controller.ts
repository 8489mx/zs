import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../../core/auth/interfaces/request-with-auth.interface';
import {
  KdsService,
  KdsStation,
  KdsTicketStatus,
  KdsItemStatus,
} from '../services/kds.service';

@Controller('api/sales/kds')
@UseGuards(SessionAuthGuard)
export class KdsController {
  constructor(private readonly kdsService: KdsService) {}

  @Get('tickets')
  async getTickets(
    @Req() req: RequestWithAuth,
    @Query('station') station?: KdsStation,
    @Query('orderType') orderType?: string,
    @Query('status') status?: KdsTicketStatus,
  ) {
    return this.kdsService.getActiveTickets(req.authContext!, {
      station,
      orderType,
      status,
    });
  }

  @Post('tickets/:id/advance')
  async advanceStatus(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithAuth,
  ) {
    return this.kdsService.advanceTicketStatus(req.authContext!, id);
  }

  @Post('tickets/:id/status')
  async setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: KdsTicketStatus,
    @Req() req: RequestWithAuth,
  ) {
    return this.kdsService.setTicketStatus(req.authContext!, id, status);
  }

  @Post('tickets/:id/items/:itemId/status')
  async setItemStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body('status') status: KdsItemStatus,
    @Req() req: RequestWithAuth,
  ) {
    return this.kdsService.setItemStatus(req.authContext!, id, itemId, status);
  }

  @Post('tickets/recall-last')
  async recallLastServed(@Req() req: RequestWithAuth) {
    return this.kdsService.recallLastServedTicket(req.authContext!);
  }
}
