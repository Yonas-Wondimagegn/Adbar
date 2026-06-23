/**
 * USSD Menu Builder
 * Constructs menu text for the *801# USSD service.
 * Supports multi-language menus (English, Amharic).
 */

export interface UssdMenuItem {
  id: string;
  labelEn: string;
  labelAm?: string;
  action?: string;
  children?: UssdMenuItem[];
}

export interface UssdMenuText {
  text: string;
  isEnd: boolean;
}

export class UssdMenuBuilder {
  private language: 'en' | 'am' = 'en';

  setLanguage(lang: 'en' | 'am'): this {
    this.language = lang;
    return this;
  }

  buildMenu(items: UssdMenuItem[], title: string): UssdMenuText {
    const lines = [title, ''];

    items.forEach((item, index) => {
      const label = this.language === 'am' && item.labelAm ? item.labelAm : item.labelEn;
      lines.push(`${index + 1}. ${label}`);
    });

    return {
      text: lines.join('\n'),
      isEnd: false,
    };
  }

  buildMainMenu(): UssdMenuText {
    const title = this.language === 'am' ? 'ዋና ምናሌ' : 'Adbar Main Menu';
    const items: UssdMenuItem[] = [
      { id: 'balance', labelEn: 'Check Balance', labelAm: 'ባለቤትነት ማረጋገጥ' },
      { id: 'order_status', labelEn: 'Order Status', labelAm: 'የትዕዛዝ ሁኔታ' },
      { id: 'escrow_status', labelEn: 'Escrow Status', labelAm: 'የእስክሮው ሁኔታ' },
      { id: 'withdrawal', labelEn: 'Withdrawal', labelAm: 'ማውጣት' },
      { id: 'language', labelEn: 'Switch Language', labelAm: 'ቋንቋ መቀየር' },
    ];

    return this.buildMenu(items, title);
  }

  buildBalanceMenu(balances: Array<{ currency: string; available: number; pending: number }>): UssdMenuText {
    const lines: string[] = [];

    if (this.language === 'am') {
      lines.push('የቦርሳ ቀሪ ሂሳብ');
    } else {
      lines.push('Your Wallet Balance');
    }
    lines.push('');

    if (balances.length === 0) {
      lines.push(this.language === 'am' ? 'ምንም ቀሪ ሂሳብ የለም' : 'No balance available');
    } else {
      balances.forEach((b) => {
        lines.push(`${b.currency}: ${b.available.toFixed(2)}`);
        if (b.pending > 0) {
          lines.push(
            `  ${this.language === 'am' ? 'በመጠባበቅ' : 'Pending'}: ${b.pending.toFixed(2)}`,
          );
        }
      });
    }

    lines.push('');
    lines.push(this.language === 'am' ? '0. ተመለስ' : '0. Back');

    return { text: lines.join('\n'), isEnd: false };
  }

  buildOrderStatusMenu(orders: Array<{ id: string; status: string; total: number; currency: string }>): UssdMenuText {
    const title = this.language === 'am' ? 'የትዕዛዝ ሁኔታ' : 'Order Status';
    const lines = [title, ''];

    if (orders.length === 0) {
      lines.push(this.language === 'am' ? 'ምንም ትዕዛዝ የለም' : 'No recent orders');
    } else {
      orders.slice(0, 5).forEach((order, index) => {
        const shortId = order.id.substring(0, 8);
        lines.push(`${index + 1}. #${shortId} - ${order.status}`);
        lines.push(`   ${order.currency} ${order.total.toFixed(2)}`);
      });
    }

    lines.push('');
    lines.push(this.language === 'am' ? '0. ተመለስ' : '0. Back');

    return { text: lines.join('\n'), isEnd: false };
  }

  buildEscrowStatusMenu(escrows: Array<{ id: string; projectTitle: string; status: string; totalAmount: number; currency: string }>): UssdMenuText {
    const title = this.language === 'am' ? 'የእስክሮው ሁኔታ' : 'Escrow Status';
    const lines = [title, ''];

    if (escrows.length === 0) {
      lines.push(this.language === 'am' ? 'ምንም እስክሮው የለም' : 'No active escrows');
    } else {
      escrows.slice(0, 5).forEach((escrow, index) => {
        const shortId = escrow.id.substring(0, 8);
        lines.push(`${index + 1}. #${shortId} - ${escrow.projectTitle}`);
        lines.push(`   ${escrow.currency} ${escrow.totalAmount.toFixed(2)} (${escrow.status})`);
      });
    }

    lines.push('');
    lines.push(this.language === 'am' ? '0. ተመለስ' : '0. Back');

    return { text: lines.join('\n'), isEnd: false };
  }

  buildWithdrawalMenu(): UssdMenuText {
    const title = this.language === 'am' ? 'ማውጣት' : 'Withdrawal';
    const items: UssdMenuItem[] = [
      { id: 'withdraw_bank', labelEn: 'Withdraw to Bank', labelAm: 'ወደ ባንክ ማውጣት' },
      { id: 'withdraw_mobile', labelEn: 'Withdraw to Mobile Money', labelAm: 'ወደ ሞባይል ገንዘብ ማውጣት' },
      { id: 'withdraw_history', labelEn: 'Withdrawal History', labelAm: 'የማውጣት ታሪክ' },
    ];

    return this.buildMenu(items, title);
  }

  buildLanguageMenu(): UssdMenuText {
    return {
      text: 'Select Language / ቋንቋ ይምረጡ\n\n1. English\n2. አማርኛ\n\n0. Back / ተመለስ',
      isEnd: false,
    };
  }

  buildWithdrawalAmountMenu(currency: string): UssdMenuText {
    const title = this.language === 'am' ? 'መጠን ያስገቡ' : 'Enter Amount';
    return {
      text: `${title} (${currency}):\n\n0. ${this.language === 'am' ? 'ተመለስ' : 'Back'}`,
      isEnd: false,
    };
  }

  buildConfirmationMenu(action: string): UssdMenuText {
    return {
      text: `${this.language === 'am' ? 'እርግጠኛ ነዎት?' : 'Confirm'} ${action}?\n\n1. ${this.language === 'am' ? 'አዎ' : 'Yes'}\n2. ${this.language === 'am' ? 'አይ' : 'No'}`,
      isEnd: false,
    };
  }

  buildSuccessMenu(message: string): UssdMenuText {
    return {
      text: `${this.language === 'am' ? 'ተሳክቷል!' : 'Success!'}\n\n${message}\n\n0. ${this.language === 'am' ? 'ዋና ምናሌ' : 'Main Menu'}\n00. ${this.language === 'am' ? 'ውጣ' : 'Exit'}`,
      isEnd: false,
    };
  }

  buildErrorMenu(message: string): UssdMenuText {
    return {
      text: `${this.language === 'am' ? 'ስህተት' : 'Error'}\n\n${message}\n\n0. ${this.language === 'am' ? 'ዋና ምናሌ' : 'Main Menu'}\n00. ${this.language === 'am' ? 'ውጣ' : 'Exit'}`,
      isEnd: false,
    };
  }

  buildEndMenu(): UssdMenuText {
    return {
      text: this.language === 'am'
        ? 'እናመሰግናለሕ ስለ አድባር መጠቀምዎ። ደህና ሁኑ!'
        : 'Thank you for using Adbar. Goodbye!',
      isEnd: true,
    };
  }

  buildSessionExpiredMenu(): UssdMenuText {
    return {
      text: this.language === 'am'
        ? 'ክፍለ ጊዜው አልቋል። እባክዎ እንደገና ይሞክሩ።'
        : 'Session expired. Please dial *801# again.',
      isEnd: true,
    };
  }
}
