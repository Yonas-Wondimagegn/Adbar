import { Injectable, Inject } from '@nestjs/common';
import { PaymentProvider } from './interfaces/payment-provider.interface';
import { PaymentProviderConfig, PAYMENT_PROVIDERS } from './payment-provider.config';

@Injectable()
export class PaymentProviderRegistry {
  private readonly providers: Map<string, PaymentProvider> = new Map();
  private readonly configs: Map<string, PaymentProviderConfig> = new Map();

  constructor() {
    // Store configs
    for (const config of PAYMENT_PROVIDERS) {
      this.configs.set(config.name, config);
    }
  }

  /**
   * Register a payment provider adapter
   */
  register(provider: PaymentProvider): void {
    this.providers.set(provider.name, provider);
  }

  /**
   * Get a provider by name
   */
  get(name: string): PaymentProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all registered providers
   */
  getAll(): PaymentProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get all provider configs
   */
  getAllConfigs(): PaymentProviderConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Get providers that support a specific currency
   */
  getByCurrency(currency: string): PaymentProvider[] {
    return this.getAll().filter((provider) =>
      provider.supportsCurrency(currency),
    );
  }

  /**
   * Get provider config by name
   */
  getConfig(name: string): PaymentProviderConfig | undefined {
    return this.configs.get(name);
  }

  /**
   * Check if a provider is registered
   */
  has(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Get all enabled provider names
   */
  getEnabledProviders(): PaymentProviderConfig[] {
    return this.getAllConfigs().filter((config) => config.enabled);
  }
}
