import { Test, TestingModule } from '@nestjs/testing';
import { UssdService } from './ussd.service';
import { PrismaService } from '@adbar/common';

describe('UssdService', () => {
  let service: UssdService;
  let prisma: any;

  const mockPrisma = {
    ussdSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    wallet: {
      findUnique: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
    },
    contract: {
      findMany: jest.fn(),
    },
    withdrawalRequest: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    walletBalance: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UssdService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UssdService>(UssdService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleUssdSession', () => {
    it('should create a new session and return main menu', async () => {
      mockPrisma.ussdSession.findUnique.mockResolvedValue(null);
      mockPrisma.ussdSession.create.mockResolvedValue({
        id: 'session-1',
        phoneNumber: '+251****5678',
        sessionId: 'ussd-session-123',
        serviceCode: '*801#',
        text: '',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.handleUssdSession(
        '+251****5678',
        'ussd-session-123',
        '',
      );

      expect(result).toBeDefined();
      expect(result.sessionId).toBe('ussd-session-123');
      expect(result.text).toContain('Adbar Main Menu');
      expect(result.isEnd).toBe(false);
    });

    it('should return existing session menu', async () => {
      mockPrisma.ussdSession.findUnique.mockResolvedValue({
        id: 'session-1',
        phoneNumber: '+251****5678',
        sessionId: 'ussd-session-123',
        serviceCode: '*801#',
        text: '',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.ussdSession.update.mockResolvedValue({});

      const result = await service.handleUssdSession(
        '+251****5678',
        'ussd-session-123',
        '',
      );

      expect(result).toBeDefined();
      expect(result.text).toContain('Adbar Main Menu');
    });

    it('should handle expired session', async () => {
      const expiredDate = new Date(Date.now() - 1000);
      mockPrisma.ussdSession.findUnique.mockResolvedValue({
        id: 'session-1',
        phoneNumber: '+251****5678',
        sessionId: 'ussd-session-123',
        serviceCode: '*801#',
        text: '',
        status: 'active',
        createdAt: expiredDate,
        updatedAt: expiredDate,
      });

      mockPrisma.ussdSession.update.mockResolvedValue({});
      mockPrisma.ussdSession.create.mockResolvedValue({
        id: 'session-2',
        phoneNumber: '+251****5678',
        sessionId: 'ussd-session-123',
        serviceCode: '*801#',
        text: '',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.handleUssdSession(
        '+251****5678',
        'ussd-session-123',
        '1',
      );

      expect(result).toBeDefined();
    });

    it('should navigate to balance menu on input 1', async () => {
      mockPrisma.ussdSession.findUnique.mockResolvedValue({
        id: 'session-1',
        phoneNumber: '+251****5678',
        sessionId: 'ussd-session-123',
        serviceCode: '*801#',
        text: '',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.ussdSession.update.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrisma.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        balances: [
          {
            id: 'bal-1',
            currency: 'ETB',
            type: 'AVAILABLE',
            balance: { toNumber: () => 1500 },
          },
        ],
      });

      const result = await service.handleUssdSession(
        '+251****5678',
        'ussd-session-123',
        '1',
      );

      expect(result).toBeDefined();
      expect(result.text).toContain('ETB');
    });

    it('should exit on input 00', async () => {
      mockPrisma.ussdSession.findUnique.mockResolvedValue({
        id: 'session-1',
        phoneNumber: '+251****5678',
        sessionId: 'ussd-session-123',
        serviceCode: '*801#',
        text: '',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.ussdSession.update.mockResolvedValue({});

      const result = await service.handleUssdSession(
        '+251****5678',
        'ussd-session-123',
        '00',
      );

      expect(result).toBeDefined();
      expect(result.isEnd).toBe(true);
      expect(result.text).toContain('Thank you');
    });
  });

  describe('getSessions', () => {
    it('should return paginated sessions', async () => {
      mockPrisma.ussdSession.findMany.mockResolvedValue([
        {
          id: 'session-1',
          phoneNumber: '+251****5678',
          sessionId: 'ussd-123',
          serviceCode: '*801#',
          text: '',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      mockPrisma.ussdSession.count.mockResolvedValue(1);

      const result = await service.getSessions(1, 20);
      expect(result.sessions).toBeDefined();
      expect(result.sessions.length).toBe(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getAnalytics', () => {
    it('should return analytics data', async () => {
      mockPrisma.ussdSession.findMany.mockResolvedValue([
        {
          status: 'completed',
          createdAt: new Date(),
        },
        {
          status: 'expired',
          createdAt: new Date(),
        },
      ]);

      const result = await service.getAnalytics(30);

      expect(result).toBeDefined();
      expect(result.totalSessions).toBe(2);
      expect(result.languageBreakdown).toBeDefined();
      expect(result.menuBreakdown).toBeDefined();
      expect(result.averageSessionDuration).toBeGreaterThanOrEqual(0);
    });
  });
});
