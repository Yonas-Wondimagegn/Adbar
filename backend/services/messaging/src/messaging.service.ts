import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@adbar/common';
import { PaginationDto } from '@adbar/common';

@Injectable()
export class MessagingService {
  constructor(private readonly prisma: PrismaService) {}

  // ========== CREATE CONVERSATION ==========

  async createConversation(data: any, userId: string) {
    // Ensure creator is included in participants
    const participantIds = [...new Set([userId, ...data.participantIds])];

    const conversation = await this.prisma.conversation.create({
      data: {
        title: data.title,
        jobId: data.jobId,
        contractId: data.contractId,
        createdById: userId,
        participants: {
          create: participantIds.map((id: string) => ({
            userId: id,
            joinedAt: new Date(),
          })),
        },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        job: { select: { id: true, title: true } },
        contract: { select: { id: true, title: true } },
      },
    });

    return conversation;
  }

  // ========== GET CONVERSATIONS ==========

  async getConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        participants: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        job: { select: { id: true, title: true } },
        contract: { select: { id: true, title: true } },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });
  }

  // ========== GET MESSAGES ==========

  async getMessages(conversationId: string, userId: string, paginationDto: PaginationDto) {
    const { page = 1, limit = 50 } = paginationDto;
    const skip = (page - 1) * limit;

    // Verify user is a participant
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    const [data, totalItems] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          readBy: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  // ========== SEND MESSAGE ==========

  async sendMessage(conversationId: string, data: any, userId: string) {
    // Verify user is a participant
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: data.content,
        type: data.messageType || 'TEXT',
        fileUrl: data.attachments?.[0],
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    // Update conversation updatedAt
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  // ========== MARK AS READ ==========

  async markAsRead(conversationId: string, userId: string) {
    // Verify user is a participant
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    // Get all unread messages in the conversation (not sent by current user)
    const unreadMessages = await this.prisma.message.findMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readBy: {
          none: { userId },
        },
      },
      select: { id: true },
    });

    // Create read receipts
    if (unreadMessages.length > 0) {
      await this.prisma.messageReadReceipt.createMany({
        data: unreadMessages.map((msg) => ({
          messageId: msg.id,
          userId,
          readAt: new Date(),
        })),
      });
    }
  }
}
