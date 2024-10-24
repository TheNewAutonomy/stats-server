import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { WebSocketService } from './websocket.service';  // Ensure this is correctly pointing to your WebSocketService
import { environment } from '../environments/environment'; // Import the environment

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],  // Add CommonModule here
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  title = 'Network Monitor';
  clients: any[] = [];
  networkName: string = environment.networkName;

  constructor(private webSocketService: WebSocketService) {}

  ngOnInit(): void {
    this.webSocketService.getMessages().subscribe(
      (message) => {
        if (Array.isArray(message)) {
          // Initial data from the server
          this.clients = message;
        } else if (message.id && message.stats) {
          // Update client stats
          const clientIndex = this.clients.findIndex((client) => client.id === message.id);
          if (clientIndex > -1) {
            this.clients[clientIndex].stats = message.stats;
          } else {
            this.clients.push(message);
          }
        } else if (message.disconnected) {
          // Remove disconnected client
          this.clients = this.clients.filter((client) => client.id !== message.id);
        }
      },
      (err) => console.error('WebSocket error:', err)
    );
  }

  // Helper method to get the keys of the stats object for easy iteration
  getKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }
}
