import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket$?: WebSocketSubject<any>;
  private SERVER_URL!: string;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeWebSocket();
    }
  }

  private initializeWebSocket(): void {
    if (!this.socket$) {
      // Determine the protocol (ws: for http or wss: for https)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;

      // For HTTP (port 80) and HTTPS (port 443), omit the port in WebSocket URL
      this.SERVER_URL = `${protocol}//${host}`;

      // Initialize WebSocket connection
      this.socket$ = webSocket(this.SERVER_URL);
    }
  }

  public sendMessage(message: any): void {
    if (this.socket$) {
      this.socket$.next(message);
    } else {
      console.warn('WebSocket is not available.');
    }
  }

  public getMessages(): Observable<any> {
    return this.socket$ ? this.socket$.asObservable() : new Observable();
  }
}
