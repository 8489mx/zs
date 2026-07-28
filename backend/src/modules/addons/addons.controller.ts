import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../core/auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../core/auth/guards/permissions.guard';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { UpsertAddonDto } from './dto/upsert-addon.dto';
import { AddonsService } from './addons.service';

@Controller('api/addons')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class AddonsController {
  constructor(private readonly addonsService: AddonsService) {}

  @Get()
  @RequirePermissions('canManageProducts')
  listAddons(@Req() req: RequestWithAuth) {
    return this.addonsService.listAddons(req.authContext!);
  }

  @Post()
  @RequirePermissions('canManageProducts')
  createAddon(@Body() payload: UpsertAddonDto, @Req() req: RequestWithAuth) {
    return this.addonsService.createAddon(payload, req.authContext!);
  }

  @Put(':id')
  @RequirePermissions('canManageProducts')
  updateAddon(@Param('id', ParseIntPipe) id: number, @Body() payload: UpsertAddonDto, @Req() req: RequestWithAuth) {
    return this.addonsService.updateAddon(id, payload, req.authContext!);
  }

  @Delete(':id')
  @RequirePermissions('canManageProducts')
  deleteAddon(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth) {
    return this.addonsService.deleteAddon(id, req.authContext!);
  }
}
