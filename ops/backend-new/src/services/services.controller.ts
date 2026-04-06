import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { RequestWithAuth } from '../auth/interfaces/request-with-auth.interface';
import { UpsertServiceDto } from './dto/upsert-service.dto';
import { ServicesService } from './services.service';

@Controller('api')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get('services')
  @RequirePermissions('services')
  listServices(@Query() query: Record<string, unknown>, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.servicesService.listServices(query, req.authContext!);
  }

  @Post('services')
  @RequirePermissions('services')
  createService(@Body() payload: UpsertServiceDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.servicesService.createService(payload, req.authContext!);
  }

  @Put('services/:id')
  @RequirePermissions('services')
  updateService(@Param('id', ParseIntPipe) id: number, @Body() payload: UpsertServiceDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.servicesService.updateService(id, payload, req.authContext!);
  }

  @Delete('services/:id')
  @RequirePermissions('services')
  deleteService(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.servicesService.deleteService(id, req.authContext!);
  }
}
