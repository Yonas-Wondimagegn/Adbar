import { Test, TestingModule } from '@nestjs/testing';
import { MessagingService } from './messaging.service';
import { PrismaService } from '@adbar/common';

describe('MessagingService', () => {
  let service: MessagingService;
  let prisma: any;

  const mockPrisma = {
    conversation: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    conversationParticipant: {
      findFirst: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    messageReadReceipt: {
      createMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createConversation', () => {
    it('should create a conversation with participants', async () => {
      const mockConversation = {
        id: 'conv-1',
        title: 'Project Discussion',
        createdById: 'user-1',
        participants: [
          { userId: 'user-1', user: { id: 'user-1', name: 'Alice' } },
          { userId: 'user-2', user: { id: 'user-2', name: 'Bob' } },
        ],
      };

      mockPrisma.conversation.create.mockResolvedValue(mockConversation);

      const result = await service.createConversation(
        { participantIds: ['user-2'], title: 'Project Discussion' },
        'user-1',
      );

      expect(result).toEqual(mockConversation);
      expect(mockPrisma.conversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Project Discussion',
            createdById: 'user-1',
          }),
        }),
      );
    });

    it('should include creator in participants list', async () => {
      jest.clearAllMocks();
      mockPrisma.conversation.create.mockResolvedValue({
        id: 'conv-1',
        participants: [
          { userId: 'user-1' },
          { userId: 'user-2' },
          { userId: 'user-3' },
        ],
      });

      const result = await service.createConversation(
        { participantIds: ['user-2', 'user-3'] },
        'user-1',
      );

      expect(result).toBeDefined();
      expect(mockPrisma.conversation.create).toHaveBeenCalled();
      const createCall = mockPrisma.conversation.create.mock.calls[0][0];
      const participants = createCall.data.participants.create;
      const userIds = participants.map((p: any) => p.userId);
      expect(userIds).toContain('user-1');
      expect(userIds).toContain('user-2');
      expect(userIds).toContain('user-3');
    });
  });

  describe('getConversations', () => {
    it('should return conversations for a user', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          title: 'Chat 1',
          participants: [{ userId: 'user-1' }],
          messages: [{ id: 'msg-1', content: 'Hello' }],
        },
        {
          id: 'conv-2',
          title: 'Chat 2',
          participants: [{ userId: 'user-1' }],
          messages: [{ id: 'msg-2', content: 'Hi' }],
        },
      ];

      mockPrisma.conversation.findMany.mockResolvedValue(mockConversations);

      const result = await service.getConversations('user-1');
      expect(result).toEqual(mockConversations);
      expect(mockPrisma.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            participants: expect.objectContaining({
              some: { userId: 'user-1' },
            }),
          }),
        }),
      );
    });
  });

  describe('getMessages', () => {
    it('should return paginated messages for a participant', async () => {
      const mockMessages = [
        { id: 'msg-1', content: 'Hello', senderId: 'user-2' },
        { id: 'msg-2', content: 'Hi there', senderId: 'user-1' },
      ];

      mockPrisma.conversationParticipant.findFirst.mockResolvedValue({ id: 'p-1' });
      mockPrisma.message.findMany.mockResolvedValue(mockMessages);
      mockPrisma.message.count.mockResolvedValue(2);

      const result = await service.getMessages('conv-1', 'user-1', { page: 1, limit: 50 });

      expect(result.data).toEqual(mockMessages);
      expect(result.pagination.totalItems).toBe(2);
    });

    it('should throw ForbiddenException for non-participant', async () => {
      mockPrisma.conversationParticipant.findFirst.mockResolvedValue(null);

      await expect(
        service.getMessages('conv-1', 'user-1', { page: 1, limit: 50 }),
      ).rejects.toThrow();
    });
  });

  describe('sendMessage', () => {
    it('should create a message for a participant', async () => {
      const mockMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Hello!',
        messageType: 'TEXT',
      };

      mockPrisma.conversationParticipant.findFirst.mockResolvedValue({ id: 'p-1' });
      mockPrisma.message.create.mockResolvedValue(mockMessage);
      mockPrisma.conversation.update.mockResolvedValue({});

      const result = await service.sendMessage(
        'conv-1',
        { content: 'Hello!', messageType: 'TEXT' },
        'user-1',
      );

      expect(result).toEqual(mockMessage);
    });

    it('should throw ForbiddenException for non-participant', async () => {
      mockPrisma.conversationParticipant.findFirst.mockResolvedValue(null);

      await expect(
        service.sendMessage(
          'conv-1',
          { content: 'Hello!' },
          'user-1',
        ),
      ).rejects.toThrow();
    });
  });

  describe('markAsRead', () => {
    it('should mark unread messages as read', async () => {
      mockPrisma.conversationParticipant.findFirst.mockResolvedValue({ id: 'p-1' });
      mockPrisma.message.findMany.mockResolvedValue([
        { id: 'msg-1' },
        { id: 'msg-2' },
      ]);
      mockPrisma.messageReadReceipt.createMany.mockResolvedValue({ count: 2 });

      await service.markAsRead('conv-1', 'user-1');

      expect(mockPrisma.messageReadReceipt.createMany).toHaveBeenCalledWith({
        data: [
          { messageId: 'msg-1', userId: 'user-1', readAt: expect.any(Date) },
          { messageId: 'msg-2', userId: 'user-1', readAt: expect.any(Date) },
        ],
      });
    });

    it('should throw ForbiddenException for non-participant', async () => {
      mockPrisma.conversationParticipant.findFirst.mockResolvedValue(null);

      await expect(
        service.markAsRead('conv-1', 'user-1'),
      ).rejects.toThrow();
    });
  });
});
