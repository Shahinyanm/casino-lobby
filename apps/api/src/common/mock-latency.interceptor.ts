import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable, switchMap, timer } from 'rxjs';

const disabled = process.env.MOCK_LATENCY === '0';

/** Fakes network latency so skeletons and optimistic UI are actually visible. `MOCK_LATENCY=0` turns it off. */
export class MockLatency implements NestInterceptor {
  constructor(
    private readonly minMs = 300,
    private readonly maxMs = 900,
  ) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (disabled) return next.handle();

    const ms = this.minMs + Math.random() * (this.maxMs - this.minMs);
    // Delay before the handler runs: `delay()` after it would let errors through instantly.
    return timer(ms).pipe(switchMap(() => next.handle()));
  }
}
