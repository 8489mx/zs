import { Test, TestingModule } from '@nestjs/testing';
import { EtaAuthService } from './eta-auth.service';

describe('EtaAuthService', () => {
  let service: EtaAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EtaAuthService],
    }).compile();

    service = module.get<EtaAuthService>(EtaAuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
