import { OnGatewayConnection, OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Subscription } from 'rxjs';
import { WebSocket, type Server } from 'ws';
import type { LiveMessage } from '@lobby/contracts';
import { LiveSimulator } from './live.simulator';

// A client that stops reading must not grow server memory without bound.
const MAX_BUFFERED_BYTES = 256 * 1024;

@WebSocketGateway({ path: '/ws' })
export class LiveGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() private readonly server!: Server;
  private subscription?: Subscription;

  constructor(private readonly simulator: LiveSimulator) {}

  afterInit() {
    this.subscription = this.simulator.messages$.subscribe((message) => this.broadcast(message));
  }

  handleConnection(client: WebSocket) {
    client.send(JSON.stringify(this.simulator.snapshot()));
  }

  onModuleDestroy() {
    this.subscription?.unsubscribe();
  }

  private broadcast(message: LiveMessage) {
    const data = JSON.stringify(message);

    for (const client of this.server.clients) {
      if (client.readyState === WebSocket.OPEN && client.bufferedAmount < MAX_BUFFERED_BYTES) client.send(data);
    }
  }
}
