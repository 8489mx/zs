import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { RequestWithAuth } from '../auth/interfaces/request-with-auth.interface';
import { UpsertUserDto } from './dto/upsert-user.dto';
import { UsersService } from './users.service';

@Controller('api/users')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('canManageUsers')
  list(@Query() query: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.usersService.listUsers(query);
  }

  @Post()
  @RequirePermissions('canManageUsers')
  create(@Body() payload: UpsertUserDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.usersService.createUser(payload, req.authContext!);
  }

  @Put(':id')
  @RequirePermissions('canManageUsers')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpsertUserDto,
    @Req() req: RequestWithAuth,
  ): Promise<Record<string, unknown>> {
    return this.usersService.updateUser(id, payload, req.authContext!, req.authContext?.sessionId);
  }

  @Put()
  @RequirePermissions('canManageUsers')
  sync(
    @Body() payload: { users?: UpsertUserDto[] },
    @Req() req: RequestWithAuth,
  ): Promise<Record<string, unknown>> {
    return this.usersService.syncUsers(payload.users ?? [], req.authContext!, req.authContext?.sessionId);
  }

  @Delete(':id')
  @RequirePermissions('canManageUsers')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.usersService.deleteUser(id, req.authContext!);
  }

  @Post(':id/unlock')
  @RequirePermissions('canManageUsers')
  unlock(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.usersService.unlockUser(id, req.authContext!);
  }
}
