import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@adbar/common';
import { CurrentUser } from '@adbar/common';
import { WalletService } from './wallet.service';
import { CreditWalletDto } from './dto/credit-wallet.dto';
import { DebitWalletDto } from './dto/debit-wallet.dto';
import { WithdrawWalletDto } from './dto/withdraw-wallet.dto';

@ApiTags('wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Get wallet with per-currency AU balances' })
  async getWallet(@CurrentUser('id') userId: string) {
    try {
      return await this.walletService.getWallet(userId);
    } catch (error) {
      console.error('WALLET CRASH — real error:', error);
      throw error;
    }
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get wallet transactions, optionally filtered by currency' })
  @ApiQuery({ name: 'currency', required: false, description: 'Filter by currency code' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTransactions(
    @CurrentUser('id') userId: string,
    @Query('currency') currency?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.walletService.getTransactions(userId, currency, page, limit);
  }

  @Post('credit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Credit wallet (currency-match enforced)' })
  async credit(@CurrentUser('id') userId: string, @Body() dto: CreditWalletDto) {
    return this.walletService.credit(userId, dto);
  }

  @Post('debit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Debit wallet (balance check enforced)' })
  async debit(@CurrentUser('id') userId: string, @Body() dto: DebitWalletDto) {
    return this.walletService.debit(userId, dto);
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request withdrawal with currency-provider fraud detection' })
  async withdraw(@CurrentUser('id') userId: string, @Body() dto: WithdrawWalletDto) {
    return this.walletService.requestWithdrawal(userId, dto);
  }

  @Get('withdrawals')
  @ApiOperation({ summary: 'Get withdrawal history' })
  @ApiQuery({ name: 'currency', required: false, description: 'Filter by currency code' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getWithdrawals(
    @CurrentUser('id') userId: string,
    @Query('currency') currency?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.walletService.getWithdrawals(userId, currency, page, limit);
  }
}
