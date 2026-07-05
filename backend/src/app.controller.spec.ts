// src/app.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('getHealth', () => {
    it('returns status "ok" with a valid ISO timestamp', () => {
      const result = appController.getHealth();
      expect(result.status).toBe('ok');
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });
});