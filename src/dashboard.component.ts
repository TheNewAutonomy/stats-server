import { Component, OnInit } from '@angular/core';
import { WebSocketService } from '../websocket.service';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  clients: any[] = [];

  constructor(private webSocketService: WebSocketService, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.webSocketService.getMessages().subscribe(
      (message) => {
        if (Array.isArray(message)) {
          this.clients = message;
        } else if (message.id && message.stats) {
          const clientIndex = this.clients.findIndex(client => client.id === message.id);
          if (clientIndex > -1) {
            this.clients[clientIndex].stats = message.stats;
          } else {
            this.clients.push(message);
          }
          // Force Angular to detect changes after receiving data
          this.cdr.detectChanges();
        } else if (message.disconnected) {
          this.clients = this.clients.filter(client => client.id !== message.id);
          this.cdr.detectChanges();  // Update the view after client is removed
        }
      },
      (err) => console.error('WebSocket error:', err)
    );
  }
}
