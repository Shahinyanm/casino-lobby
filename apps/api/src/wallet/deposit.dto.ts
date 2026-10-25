import { IsIn, IsInt, IsString, Length, Max, Min } from 'class-validator';
import type { CurrencyCode, DepositRequest } from '@lobby/contracts';

const CURRENCIES: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'ILS'];

export class DepositDto implements DepositRequest {
  /** 0.01 .. 10 000.00 in the deposit currency */
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  amountMinor!: number;

  @IsIn(CURRENCIES)
  currency!: CurrencyCode;

  @IsString()
  @Length(8, 64)
  idempotencyKey!: string;
}
