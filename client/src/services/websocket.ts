import { WSEvent } from '../types';

type MessageCallback = (event: WSEvent) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private callbacks: MessageCallback[] = [];
  private reconnectAttempts = 0;
  private maxReconnects = 5;
  private subscribedRunnerId: string | null = null;
  private url = 'ws://localhost:3001';

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      if (this.subscribedRunnerId) {
        this.subscribe(this.subscribedRunnerId);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WSEvent;
        this.callbacks.forEach((cb) => cb(data));
      } catch {
        // ignore parse errors
      }
    };

    this.ws.onclose = () => {
      if (this.reconnectAttempts < this.maxReconnects) {
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
      }
    };
  }

  subscribe(runnerId: string): void {
    this.subscribedRunnerId = runnerId;
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ subscribe: runnerId }));
    } else {
      this.connect();
    }
  }

  onMessage(callback: MessageCallback): () => void {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    };
  }

  unsubscribe(): void {
    this.subscribedRunnerId = null;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.callbacks = [];
  }
}

export default new WebSocketService();
