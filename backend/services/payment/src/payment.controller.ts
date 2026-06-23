import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader, ApiBody } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, Public } from '@adbar/common';

class InitiatePaymentDto {
  orderId!: string;
  amount!: number;
  currency!: string;
  provider!: string;
  customerEmail?: string;
  customerName?: string;
  returnUrl?: string;
  cancelUrl?: string;
  description?: string;
  metadata?: Record<string, any>;
}

class VerifyPaymentDto {
  reference!: string;
  provider!: string;
}

class RefundPaymentDto {
  transactionId!: string;
  amount!: number;
  currency!: string;
  provider!: string;
  reason?: string;
}

class WebhookPayloadDto {
  [key: string]: any;
}

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ========== PROVIDERS ==========

  @Get('providers')
  @Public()
  @ApiOperation({ summary: 'Get available payment providers' })
  async getProviders(@Query('currency') currency?: string) {
    const providers = await this.paymentService.getProviders(currency);
    return { statusCode: HttpStatus.OK, data: providers };
  }

  // ========== INITIATE PAYMENT ==========

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Initiate a payment' })
  async initiatePayment(
    @Body() initiatePaymentDto: InitiatePaymentDto,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.paymentService.initiatePayment(initiatePaymentDto, userId);
    return { statusCode: HttpStatus.CREATED, data: result, message: 'Payment initiated' };
  }

  // ========== VERIFY PAYMENT ==========

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a payment' })
  async verifyPayment(@Body() verifyPaymentDto: VerifyPaymentDto) {
    const result = await this.paymentService.verifyPayment(
      verifyPaymentDto.reference,
      verifyPaymentDto.provider,
    );
    return { statusCode: HttpStatus.OK, data: result };
  }

  // ========== REFUND ==========

  @Post('refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'seller')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Process a refund' })
  async refund(@Body() refundPaymentDto: RefundPaymentDto) {
    const result = await this.paymentService.refund(refundPaymentDto);
    return { statusCode: HttpStatus.CREATED, data: result, message: 'Refund processed' };
  }

  // ========== WEBHOOKS ==========

  @Post(':provider/webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle payment provider webhooks' })
  @ApiHeader({ name: 'x-webhook-signature', required: false })
  @ApiHeader({ name: 'x-stripe-signature', required: false })
  @ApiHeader({ name: 'x-paypal-auth-algo', required: false })
  async handleWebhook(
    @Param('provider') provider: string,
    @Body() payload: WebhookPayloadDto,
    @Headers() headers: Record<string, string>,
  ) {
    const result = await this.paymentService.handleWebhook(provider, payload, headers);
    return { statusCode: HttpStatus.OK, data: result };
  }

  // ========== PAYMENT STATUS ==========

  @Get(':provider/status/:reference')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment status' })
  async getPaymentStatus(
    @Param('provider') provider: string,
    @Param('reference') reference: string,
  ) {
    const result = await this.paymentService.verifyPayment(reference, provider);
    return { statusCode: HttpStatus.OK, data: result };
  }
}
