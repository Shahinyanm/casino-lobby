// Wire types shared by the API and the web app. Types only: nothing here exists at runtime.

export type Category = 'slots' | 'table' | 'live';

export type GameTag =
  | 'jackpot'
  | 'megaways'
  | 'bonus-buy'
  | 'hot'
  | 'classic'
  | 'high-volatility'
  | 'vip'
  | 'low-stakes';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'ILS';

/** All money crosses the wire as integer minor units (cents). */
export interface Game {
  id: string;
  title: string;
  providerId: string;
  category: Category;
  tags: GameTag[];
  /** Percent, two decimals, e.g. 96.21 */
  rtp: number;
  minBetMinor: number;
  maxBetMinor: number;
  /** 0..100, drives the "Trending" sort */
  popularity: number;
  /** ISO date, drives the "New releases" sort */
  releasedAt: string;
  thumbnailUrl: string;
}

export interface Provider {
  id: string;
  name: string;
}

export interface CatalogResponse {
  currency: CurrencyCode;
  games: Game[];
  providers: Provider[];
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  cta: string;
  /** In-app link, usually a pre-filtered catalog view such as `/?tag=jackpot` */
  href: string;
  /** Hue for the card artwork, 0..360 */
  hue: number;
  endsAt: string;
}

export type TransactionType = 'deposit' | 'win' | 'bet' | 'bonus';

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Always positive, in wallet currency; `type` gives the sign */
  amountMinor: number;
  currency: CurrencyCode;
  createdAt: string;
  /** What the player actually paid, when it differs from the wallet currency */
  source?: { amountMinor: number; currency: CurrencyCode };
  /** Client idempotency key of the deposit or spin that created it; lets the UI match it to its own request */
  reference?: string;
}

export interface Wallet {
  currency: CurrencyCode;
  balanceMinor: number;
  /** Grows with every change, so a client can keep the newest snapshot when answers arrive out of order */
  revision: number;
  transactions: Transaction[];
}

export interface FxRates {
  base: CurrencyCode;
  /** 1 unit of the key currency = `rate` units of `base` */
  rates: Record<CurrencyCode, number>;
}

export interface DepositRequest {
  amountMinor: number;
  currency: CurrencyCode;
  idempotencyKey: string;
}

export interface DepositResponse {
  /** The whole wallet as it is now; a replay of the same key returns the original transaction with it */
  wallet: Wallet;
  transaction: Transaction;
}

export type ApiErrorCode =
  | 'DEPOSIT_DECLINED'
  | 'INSUFFICIENT_FUNDS'
  | 'IDEMPOTENCY_CONFLICT'
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'
  | 'INTERNAL';

export interface ApiError {
  code: ApiErrorCode;
  message: string;
}

export type SlotSymbol = 'seven' | 'bar' | 'bell' | 'lemon' | 'cherry';

export interface SlotPayout {
  symbol: SlotSymbol;
  /** How many of `symbol` the middle line needs, in any position */
  count: number;
  /** Win = bet × multiplier */
  multiplier: number;
}

export interface SlotMachine {
  /** One strip per reel. A stop is an index into its strip: the symbol that lands on the middle line */
  reels: SlotSymbol[][];
  paytable: SlotPayout[];
  betsMinor: number[];
  currency: CurrencyCode;
  /** Percent, exact: the paytable summed over every combination of stops */
  rtp: number;
}

export interface SpinRequest {
  betMinor: number;
  idempotencyKey: string;
}

export interface Spin {
  id: string;
  betMinor: number;
  stops: number[];
  winMinor: number;
}

export interface SpinResponse {
  spin: Spin;
  /** The whole wallet with the bet taken and the win paid */
  wallet: Wallet;
}

export interface Win {
  id: string;
  player: string;
  avatarHue: number;
  gameId: string;
  gameTitle: string;
  amountMinor: number;
  currency: CurrencyCode;
  at: string;
}

export type LiveMessage =
  | { type: 'snapshot'; jackpotMinor: number; wins: Win[] }
  | { type: 'win'; win: Win }
  | { type: 'jackpot'; jackpotMinor: number };
