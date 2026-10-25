import { IsIn, IsString, Length } from 'class-validator';
import type { SpinRequest } from '@lobby/contracts';
import { BETS_MINOR } from './slot-machine';

export class SpinDto implements SpinRequest {
  @IsIn(BETS_MINOR)
  betMinor!: number;

  @IsString()
  @Length(8, 64)
  idempotencyKey!: string;
}
