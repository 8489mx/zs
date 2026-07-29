import { Test, TestingModule } from '@nestjs/testing';
import { TaxSettingsService } from './tax-settings.service';

describe('TaxSettingsService', () => {
  let service: TaxSettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TaxSettingsService],
    }).compile();

    service = module.get<TaxSettingsService>(TaxSettingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
