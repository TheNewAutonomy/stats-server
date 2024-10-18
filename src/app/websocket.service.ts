import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})

const externalIp = process.env['EXTERNAL_IP'];

export class WebSocketService {
  private socket$!: WebSocketSubject<any>;  // Use definite assignment assertion
  private readonly SERVER_URL = `ws://${externalIp}:3000/`;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      // Only initialize WebSocket if in the browser environment
      this.socket$ = webSocket(this.SERVER_URL);
    }
  }

  public sendMessage(message: any): void {
    if (this.socket$) {
      this.socket$.next(message);
    }
  }

  public getMessages(): Observable<any> {
    return this.socket$ ? this.socket$.asObservable() : new Observable();
  }
}

