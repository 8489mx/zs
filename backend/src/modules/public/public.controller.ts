import { Body, Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { PublicTrialSignupDto } from './dto/public-trial-signup.dto';
import { PublicTrialSignupService } from './public-trial-signup.service';

@Controller('api/public')
export class PublicController {
  constructor(private readonly service: PublicTrialSignupService) {}

  @Post('trial-signup')
  signup(@Body() body: PublicTrialSignupDto, @Req() req: Request) {
    const ip = String(req.ip || req.socket?.remoteAddress || 'unknown').trim() || 'unknown';
    return this.service.signup(body, ip);
  }
}

