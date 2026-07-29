import { Test, TestingModule } from '@nestjs/testing';
import { TaxSettingsController } from './tax-settings.controller';

describe('TaxSettingsController', () => {
  let controller: TaxSettingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaxSettingsController],
    }).compile();

    controller = module.get<TaxSettingsController>(TaxSettingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
