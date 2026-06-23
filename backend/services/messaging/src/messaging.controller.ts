import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser, PaginationDto } from '@adbar/common';
import { MessagingService } from './messaging.service';

class CreateConversationDto {
  participantIds!: string[];
  title?: string;
  jobId?: string;
  contractId?: string;
}

class SendMessageDto {
  conversationId!: string;
  content!: string;
  messageType?: string;
  attachments?: string[];
}

@ApiTags('messaging')
@Controller('conversations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get()
  @ApiOperation({ summary: 'Get all conversations for current user' })
  async getConversations(@CurrentUser('id') userId: string) {
    return this.messagingService.getConversations(userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new conversation' })
  async createConversation(
    @Body() createConversationDto: CreateConversationDto,
    @CurrentUser('id') userId: string,
  ) {
    const conversation = await this.messagingService.createConversation(createConversationDto, userId);
    return { statusCode: HttpStatus.CREATED, data: conversation, message: 'Conversation created successfully' };
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get messages in a conversation' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMessages(
    @Param('id') conversationId: string,
    @CurrentUser('id') userId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.messagingService.getMessages(conversationId, userId, paginationDto);
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a message in a conversation' })
  async sendMessage(
    @Param('id') conversationId: string,
    @Body() sendMessageDto: SendMessageDto,
    @CurrentUser('id') userId: string,
  ) {
    const message = await this.messagingService.sendMessage(conversationId, sendMessageDto, userId);
    return { statusCode: HttpStatus.CREATED, data: message, message: 'Message sent successfully' };
  }

  @Put(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark conversation as read' })
  async markAsRead(
    @Param('id') conversationId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.messagingService.markAsRead(conversationId, userId);
    return { statusCode: HttpStatus.OK, message: 'Messages marked as read' };
  }
}
