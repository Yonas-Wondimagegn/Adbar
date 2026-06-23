import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@adbar/common';
import { UssdMenuBuilder, UssdMenuText } from './ussd-menu.builder';

interface UssdSessionState {
  id: string;
  phoneNumber: string;
  sessionId: string;
  currentMenu: string;
  language: 'en' | 'am';
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export interface UssdCallbackResponse {
  sessionId: string;
  phoneNumber: string;
  text: string;
  isEnd: boolean;
}

export interface UssdAnalytics {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  expiredSessions: number;
  menuBreakdown: Record<string, number>;
  languageBreakdown: Record<string, number>;
  averageSessionDuration: number;
  period: { start: Date; end: Date };
}

/**
 * USSD Service — handles *801# menu-driven interface for feature phones.
 *
 * Session state (currentMenu, language, data) is held in memory for fast access.
 * The Prisma UssdSession model is used for persistence/analytics only.
 */
@Injectable()
export class UssdService {
  private readonly logger = new Logger(UssdService.name);
  private readonly SESSION_TIMEOUT_MS = 300000; // 5 minutes
  private readonly sessionCache = new Map<string, UssdSessionState>();

  constructor(private readonly prisma: PrismaService) {}

  // ========== HANDLE USSD CALLBACK ==========

  async handleUssdSession(
    phoneNumber: string,
    sessionId: string,
    userInput: string,
    _networkCode?: string,
  ): Promise<UssdCallbackResponse> {
    this.logger.log(`USSD session: ${sessionId}, phone: ${phoneNumber}, input: "${userInput}"`);

    let session = this.sessionCache.get(sessionId);

    if (!session) {
      // Try to load from DB
      const dbSession = await this.prisma.ussdSession.findUnique({
        where: { sessionId },
      });
      if (dbSession && dbSession.status === 'active') {
        session = {
          id: dbSession.id,
          phoneNumber: dbSession.phoneNumber,
          sessionId: dbSession.sessionId,
          currentMenu: 'main',
          language: 'en',
          data: {},
          createdAt: dbSession.createdAt,
          updatedAt: dbSession.updatedAt,
          expiresAt: new Date(Date.now() + this.SESSION_TIMEOUT_MS),
        };
        this.sessionCache.set(sessionId, session);
      }
    }

    if (!session) {
      if (!userInput || userInput === '') {
        session = await this.createSession(phoneNumber, sessionId);
        const menu = this.buildMenuResponse(session, 'main');
        return { sessionId, phoneNumber, text: menu.text, isEnd: menu.isEnd };
      }
      session = await this.createSession(phoneNumber, sessionId);
    }

    if (new Date() > session.expiresAt) {
      await this.expireSession(session.id);
      this.sessionCache.delete(sessionId);
      const menuBuilder = new UssdMenuBuilder().setLanguage(session.language);
      const menu = menuBuilder.buildSessionExpiredMenu();
      return { sessionId, phoneNumber, text: menu.text, isEnd: menu.isEnd };
    }

    await this.touchSession(session.id);
    session.expiresAt = new Date(Date.now() + this.SESSION_TIMEOUT_MS);

    // If userInput is empty, show the current menu (resume session)
    if (!userInput || userInput === '') {
      const menu = this.buildMenuResponse(session, session.currentMenu);
      return { sessionId, phoneNumber, text: menu.text, isEnd: menu.isEnd };
    }

    const response = await this.processInput(session, userInput);

    return { sessionId, phoneNumber, text: response.text, isEnd: response.isEnd };
  }

  // ========== PROCESS INPUT ==========

  private async processInput(session: UssdSessionState, input: string): Promise<UssdMenuText> {
    const menuBuilder = new UssdMenuBuilder().setLanguage(session.language);

    if (input === '00') {
      await this.closeSession(session.id);
      this.sessionCache.delete(session.sessionId);
      return menuBuilder.buildEndMenu();
    }

    if (input === '0') {
      session.currentMenu = 'main';
      return menuBuilder.buildMainMenu();
    }

    switch (session.currentMenu) {
      case 'main':
        return this.handleMainMenuInput(session, input, menuBuilder);
      case 'balance':
        return this.handleBalanceInput(session, input, menuBuilder);
      case 'order_status':
        return this.handleOrderStatusInput(session, input, menuBuilder);
      case 'escrow_status':
        return this.handleEscrowStatusInput(session, input, menuBuilder);
      case 'withdrawal':
        return this.handleWithdrawalInput(session, input, menuBuilder);
      case 'withdrawal_amount':
        return this.handleWithdrawalAmountInput(session, input, menuBuilder);
      case 'withdrawal_confirm':
        return this.handleWithdrawalConfirmInput(session, input, menuBuilder);
      case 'language':
        return this.handleLanguageInput(session, input, menuBuilder);
      default:
        session.currentMenu = 'main';
        return menuBuilder.buildMainMenu();
    }
  }

  // ========== MAIN MENU ==========

  private async handleMainMenuInput(
    session: UssdSessionState,
    input: string,
    menuBuilder: UssdMenuBuilder,
  ): Promise<UssdMenuText> {
    switch (input) {
      case '1':
        session.currentMenu = 'balance';
        return await this.showBalance(session, menuBuilder);
      case '2':
        session.currentMenu = 'order_status';
        return await this.showOrderStatus(session, menuBuilder);
      case '3':
        session.currentMenu = 'escrow_status';
        return await this.showEscrowStatus(session, menuBuilder);
      case '4':
        session.currentMenu = 'withdrawal';
        return menuBuilder.buildWithdrawalMenu();
      case '5':
        session.currentMenu = 'language';
        return menuBuilder.buildLanguageMenu();
      default:
        return menuBuilder.buildErrorMenu(
          session.language === 'am' ? 'ልካን ምርጫ ያስገቡ' : 'Invalid choice. Please try again.',
        );
    }
  }

  // ========== BALANCE ==========

  private async showBalance(
    session: UssdSessionState,
    menuBuilder: UssdMenuBuilder,
  ): Promise<UssdMenuText> {
    const user = await this.findUserByPhone(session.phoneNumber);
    if (!user) {
      return menuBuilder.buildErrorMenu(
        session.language === 'am' ? 'ተጠቃሚ አልተገኘም' : 'User not found',
      );
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: user.id },
      include: { balances: true },
    });

    const balances = (wallet?.balances || [])
      .filter((b: any) => b.type === 'AVAILABLE')
      .map((b: any) => ({
        currency: b.currency,
        available: b.balance.toNumber(),
        pending: 0,
      }));

    return menuBuilder.buildBalanceMenu(balances);
  }

  private async handleBalanceInput(
    session: UssdSessionState,
    input: string,
    menuBuilder: UssdMenuBuilder,
  ): Promise<UssdMenuText> {
    if (input === '0') {
      session.currentMenu = 'main';
      return menuBuilder.buildMainMenu();
    }
    return menuBuilder.buildBalanceMenu([]);
  }

  // ========== ORDER STATUS ==========

  private async showOrderStatus(
    session: UssdSessionState,
    menuBuilder: UssdMenuBuilder,
  ): Promise<UssdMenuText> {
    const user = await this.findUserByPhone(session.phoneNumber);
    if (!user) {
      return menuBuilder.buildErrorMenu(
        session.language === 'am' ? 'ተጠቃሚ አተገኘም' : 'User not found',
      );
    }

    const orders = await this.prisma.order.findMany({
      where: { OR: [{ buyerId: user.id }, { sellerId: user.id }] },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const orderList = orders.map((o: any) => ({
      id: o.id,
      status: o.status,
      total: o.total.toNumber(),
      currency: o.currency,
    }));

    return menuBuilder.buildOrderStatusMenu(orderList);
  }

  private async handleOrderStatusInput(
    session: UssdSessionState,
    input: string,
    menuBuilder: UssdMenuBuilder,
  ): Promise<UssdMenuText> {
    if (input === '0') {
      session.currentMenu = 'main';
      return menuBuilder.buildMainMenu();
    }
    return menuBuilder.buildOrderStatusMenu([]);
  }

  // ========== ESCROW STATUS ==========

  private async showEscrowStatus(
    session: UssdSessionState,
    menuBuilder: UssdMenuBuilder,
  ): Promise<UssdMenuText> {
    const user = await this.findUserByPhone(session.phoneNumber);
    if (!user) {
      return menuBuilder.buildErrorMenu(
        session.language === 'am' ? 'ተጠቃሚ አልተገኘም' : 'User not found',
      );
    }

    const contracts = await this.prisma.contract.findMany({
      where: {
        OR: [{ clientId: user.id }, { freelancerId: user.id }],
      },
      include: { escrow: true },
    });

    const escrowList = contracts
      .filter((c: any) => c.escrow)
      .map((c: any) => ({
        id: c.escrow!.id,
        projectTitle: c.title,
        status: c.escrow!.status,
        totalAmount: c.escrow!.amount.toNumber(),
        currency: c.escrow!.currency,
      }));

    return menuBuilder.buildEscrowStatusMenu(escrowList);
  }

  private async handleEscrowStatusInput(
    session: UssdSessionState,
    input: string,
    menuBuilder: UssdMenuBuilder,
  ): Promise<UssdMenuText> {
    if (input === '0') {
      session.currentMenu = 'main';
      return menuBuilder.buildMainMenu();
    }
    return menuBuilder.buildEscrowStatusMenu([]);
  }

  // ========== WITHDRAWAL ==========

  private async handleWithdrawalInput(
    session: UssdSessionState,
    input: string,
    menuBuilder: UssdMenuBuilder,
  ): Promise<UssdMenuText> {
    switch (input) {
      case '1':
        session.currentMenu = 'withdrawal_amount';
        session.data['withdrawalMethod'] = 'bank';
        return menuBuilder.buildWithdrawalAmountMenu('ETB');
      case '2':
        session.currentMenu = 'withdrawal_amount';
        session.data['withdrawalMethod'] = 'mobile_money';
        return menuBuilder.buildWithdrawalAmountMenu('ETB');
      case '3':
        return await this.showWithdrawalHistory(session, menuBuilder);
      case '0':
        session.currentMenu = 'main';
        return menuBuilder.buildMainMenu();
      default:
        return menuBuilder.buildErrorMenu(
          session.language === 'am' ? 'ልካን ምርጫ ያስገቡ' : 'Invalid choice',
        );
    }
  }

  private async handleWithdrawalAmountInput(
    session: UssdSessionState,
    input: string,
    menuBuilder: UssdMenuBuilder,
  ): Promise<UssdMenuText> {
    if (input === '0') {
      session.currentMenu = 'withdrawal';
      return menuBuilder.buildWithdrawalMenu();
    }

    const amount = parseFloat(input);
    if (isNaN(amount) || amount <= 0) {
      return menuBuilder.buildErrorMenu(
        session.language === 'am' ? 'የማይሰራ መጠን' : 'Invalid amount',
      );
    }

    session.data['withdrawalAmount'] = amount;
    session.currentMenu = 'withdrawal_confirm';

    const method = session.data['withdrawalMethod'] === 'bank'
      ? (session.language === 'am' ? 'ባንክ' : 'Bank')
      : (session.language === 'am' ? 'ሞባይል ገንዘብ' : 'Mobile Money');

    return menuBuilder.buildConfirmationMenu(
      `${session.language === 'am' ? 'ማውጣት' : 'Withdraw'} ${amount} ETB ${session.language === 'am' ? 'ወደ' : 'to'} ${method}`,
    );
  }

  private async handleWithdrawalConfirmInput(
    session: UssdSessionState,
    input: string,
    menuBuilder: UssdMenuBuilder,
  ): Promise<UssdMenuText> {
    if (input === '1') {
      const amount = session.data['withdrawalAmount'];
      const method = session.data['withdrawalMethod'];

      if (!amount) {
        return menuBuilder.buildErrorMenu(
          session.language === 'am' ? 'ስህተት ተፈጥሯል' : 'An error occurred',
        );
      }

      try {
        await this.processWithdrawal(session, amount, method);
        await this.closeSession(session.id);
        this.sessionCache.delete(session.sessionId);
        return menuBuilder.buildSuccessMenu(
          `${session.language === 'am' ? 'ጥያቄዎ ተቀብሏል' : 'Your withdrawal request has been submitted'}. ${amount} ETB`,
        );
      } catch (error) {
        return menuBuilder.buildErrorMenu(
          session.language === 'am' ? 'ማውጣት አልተሳካም' : 'Withdrawal failed. Please try again.',
        );
      }
    }

    session.currentMenu = 'main';
    return menuBuilder.buildMainMenu();
  }

  private async showWithdrawalHistory(
    session: UssdSessionState,
    menuBuilder: UssdMenuBuilder,
  ): Promise<UssdMenuText> {
    const user = await this.findUserByPhone(session.phoneNumber);
    if (!user) {
      return menuBuilder.buildErrorMenu(
        session.language === 'am' ? 'ተጠቃሚ አልተገኘም' : 'User not found',
      );
    }

    const withdrawals = await this.prisma.withdrawalRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const lines = [
      session.language === 'am' ? 'የማውጣት ታሪክ' : 'Withdrawal History',
      '',
    ];

    if (withdrawals.length === 0) {
      lines.push(session.language === 'am' ? 'ምንም ማውጣት የለም' : 'No withdrawals');
    } else {
      withdrawals.forEach((w: any) => {
        const shortId = w.id.substring(0, 8);
        lines.push(`#${shortId} - ${w.currency} ${w.amount.toNumber().toFixed(2)}`);
        lines.push(`  ${w.status}`);
      });
    }

    lines.push('');
    lines.push('0. Back');

    return { text: lines.join('\n'), isEnd: false };
  }

  // ========== LANGUAGE ==========

  private async handleLanguageInput(
    session: UssdSessionState,
    input: string,
    menuBuilder: UssdMenuBuilder,
  ): Promise<UssdMenuText> {
    if (input === '1') {
      session.language = 'en';
      session.currentMenu = 'main';
      return new UssdMenuBuilder().setLanguage('en').buildMainMenu();
    }
    if (input === '2') {
      session.language = 'am';
      session.currentMenu = 'main';
      return new UssdMenuBuilder().setLanguage('am').buildMainMenu();
    }
    if (input === '0') {
      session.currentMenu = 'main';
      return menuBuilder.buildMainMenu();
    }
    return menuBuilder.buildLanguageMenu();
  }

  // ========== SESSION MANAGEMENT ==========

  private async createSession(phoneNumber: string, sessionId: string): Promise<UssdSessionState> {
    const dbSession = await this.prisma.ussdSession.create({
      data: {
        phoneNumber,
        sessionId,
        serviceCode: '*801#',
        text: '',
        status: 'active',
      },
    });

    this.logger.log(`USSD session created: ${sessionId} for ${phoneNumber}`);

    const session: UssdSessionState = {
      id: dbSession.id,
      phoneNumber: dbSession.phoneNumber,
      sessionId: dbSession.sessionId,
      currentMenu: 'main',
      language: 'en',
      data: {},
      createdAt: dbSession.createdAt,
      updatedAt: dbSession.updatedAt,
      expiresAt: new Date(Date.now() + this.SESSION_TIMEOUT_MS),
    };

    this.sessionCache.set(sessionId, session);
    return session;
  }

  private async touchSession(sessionId: string): Promise<void> {
    await this.prisma.ussdSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });
  }

  private async closeSession(sessionId: string): Promise<void> {
    await this.prisma.ussdSession.update({
      where: { id: sessionId },
      data: { status: 'completed' },
    });
  }

  private async expireSession(sessionId: string): Promise<void> {
    await this.prisma.ussdSession.update({
      where: { id: sessionId },
      data: { status: 'expired' },
    });
  }

  // ========== HELPERS ==========

  private async findUserByPhone(phoneNumber: string) {
    return this.prisma.user.findUnique({
      where: { phone: phoneNumber },
      include: { roles: true },
    });
  }

  private async processWithdrawal(session: UssdSessionState, amount: number, method: string): Promise<void> {
    const user = await this.findUserByPhone(session.phoneNumber);
    if (!user) throw new NotFoundException('User not found');

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: user.id },
      include: { balances: true },
    });

    if (!wallet) throw new BadRequestException('Wallet not found');

    const etbBalance = wallet.balances.find(
      (b: any) => b.currency === 'ETB' && b.type === 'AVAILABLE',
    );

    if (!etbBalance || etbBalance.balance.toNumber() < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    await this.prisma.$transaction([
      this.prisma.walletBalance.update({
        where: { id: etbBalance.id },
        data: { balance: etbBalance.balance.sub(amount) },
      }),
      this.prisma.withdrawalRequest.create({
        data: {
          userId: user.id,
          walletId: wallet.id,
          balanceId: etbBalance.id,
          amount,
          currency: 'ETB',
          providerId: method === 'bank' ? 'bank_transfer' : 'telebirr',
          status: 'pending',
        },
      }),
    ]);
  }

  private buildMenuResponse(session: UssdSessionState, menu: string): UssdMenuText {
    const menuBuilder = new UssdMenuBuilder().setLanguage(session.language);
    switch (menu) {
      case 'main':
        return menuBuilder.buildMainMenu();
      default:
        return menuBuilder.buildMainMenu();
    }
  }

  // ========== GET SESSIONS ==========

  async getSessions(
    page: number = 1,
    limit: number = 20,
  ): Promise<{ sessions: any[]; total: number }> {
    const [sessions, total] = await Promise.all([
      this.prisma.ussdSession.findMany({
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.ussdSession.count(),
    ]);

    return { sessions, total };
  }

  // ========== ANALYTICS ==========

  async getAnalytics(periodDays: number = 30): Promise<UssdAnalytics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    const endDate = new Date();

    const sessions = await this.prisma.ussdSession.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
    });

    const totalSessions = sessions.length;
    const activeSessions = sessions.filter((s: any) => s.status === 'active').length;
    const completedSessions = sessions.filter((s: any) => s.status === 'completed').length;
    const expiredSessions = sessions.filter((s: any) => s.status === 'expired').length;

    const averageSessionDuration = 0;

    return {
      totalSessions,
      activeSessions,
      completedSessions,
      expiredSessions,
      menuBreakdown: {},
      languageBreakdown: {},
      averageSessionDuration,
      period: { start: startDate, end: endDate },
    };
  }
}
