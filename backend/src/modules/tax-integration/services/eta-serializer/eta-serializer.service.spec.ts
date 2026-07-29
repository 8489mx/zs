import { Test, TestingModule } from '@nestjs/testing';
import { EtaSerializerService } from './eta-serializer.service';

describe('EtaSerializerService', () => {
  let service: EtaSerializerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EtaSerializerService],
    }).compile();

    service = module.get<EtaSerializerService>(EtaSerializerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
