import { Body, Controller, Get, Post, UseInterceptors } from '@nestjs/common';
import type { DepositResponse, FxRates, Wallet } from '@lobby/contracts';
import { MockLatency } from '../common/mock-latency.interceptor';
import { DepositDto } from './deposit.dto';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get()
  @UseInterceptors(new MockLatency())
  getWallet(): Wallet {
    return this.wallet.getWallet();
  }

  @Get('rates')
  @UseInterceptors(new MockLatency(200, 500))
  getRates(): FxRates {
    return this.wallet.getRates();
  }

  // Slow on purpose: the optimistic balance and its rollback need time to be seen.
  @Post('deposits')
  @UseInterceptors(new MockLatency(1200, 1800))
  deposit(@Body() dto: DepositDto): DepositResponse {
    return this.wallet.deposit(dto);
  }
}
