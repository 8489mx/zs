import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { RequestWithAuth } from '../auth/interfaces/request-with-auth.interface';
import { CreateReturnDto } from './dto/create-return.dto';
import { ReturnsService } from './returns.service';

@Controller('api')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get('returns')
  @RequirePermissions('returns')
  listReturns(@Query() query: Record<string, unknown>, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.returnsService.listReturns(query, req.authContext!);
  }

  @Post('returns')
  @RequirePermissions('returns')
  createReturn(@Body() payload: CreateReturnDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.returnsService.createReturn(payload, req.authContext!);
  }
}
