import { Test, TestingModule } from '@nestjs/testing';
import { EtaSubmissionService } from './eta-submission.service';

describe('EtaSubmissionService', () => {
  let service: EtaSubmissionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EtaSubmissionService],
    }).compile();

    service = module.get<EtaSubmissionService>(EtaSubmissionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
