import { Body, Controller, Get, Post, UseInterceptors } from '@nestjs/common';
import type { SlotMachine, SpinResponse } from '@lobby/contracts';
import { MockLatency } from '../common/mock-latency.interceptor';
import { SlotService } from './slot.service';
import { SpinDto } from './spin.dto';

@Controller('slot')
export class SlotController {
  constructor(private readonly slot: SlotService) {}

  @Get()
  @UseInterceptors(new MockLatency())
  getMachine(): SlotMachine {
    return this.slot.getMachine();
  }

  @Post('spins')
  @UseInterceptors(new MockLatency(200, 500))
  spin(@Body() dto: SpinDto): SpinResponse {
    return this.slot.spin(dto);
  }
}
