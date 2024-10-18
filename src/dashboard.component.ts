import { Component, OnInit } from '@angular/core';
import { WebSocketService } from '../websocket.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  clients: any[] = [];

  constructor(private webSocketService: WebSocketService) { }

  ngOnInit(): void {
    this.webSocketService.getMessages().subscribe(
      (message) => {
        if (Array.isArray(message)) {
          // Initial data when connected
          this.clients = message;
        } else if (message.id && message.stats) {
          // Update stats of an existing client
          const clientIndex = this.clients.findIndex(client => client.id === message.id);
          if (clientIndex > -1) {
            this.clients[clientIndex].stats = message.stats;
          } else {
            this.clients.push(message);
          }
        } else if (message.disconnected) {
          // Handle client disconnection
          this.clients = this.clients.filter(client => client.id !== message.id);
        }
      },
      (err) => console.error('WebSocket error:', err)
    );
  }
}
