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
      // Dynamically construct the WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
      const wsPort = '3000'; // Replace with your WebSocket server port if different
      const urlHost = wsPort ? `${host}:${wsPort}` : host;
      this.SERVER_URL = `${protocol}//${urlHost}`;

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
