// Import necessary libraries
const http = require('http');
const WebSocket = require('ws');
const express = require('express');
const path = require('path');

// Server configuration
const PORT = process.env.PORT || 3000;

// Create an Express app
const app = express();

// Serve the Angular build files from the correct path
const buildPath = path.join(__dirname, 'dist/stats-dashboard/browser');
app.use(express.static(buildPath));

// Fallback for handling Angular client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

// Create an HTTP server
const server = http.createServer(app);

// Create a WebSocket server
const wss = new WebSocket.Server({ server });

// Track connected clients and their stats
const clients = new Map();

// Track connected dashboards (React/Web UI)
const dashboards = new Set();

// Event listener for WebSocket server connection
wss.on('connection', (ws, req) => {
  // Variables to hold client information
  let clientId;   // Unique identifier for the client
  let clientName; // Name of the client

  // Check if the connection is from the dashboard or a client
  const isDashboard = req.headers['user-agent'] && req.headers['user-agent'].includes('Mozilla');

  if (isDashboard) {
    // Handle dashboard connection
    dashboards.add(ws);
    console.log('New dashboard connected');

    // Send initial clients' stats to the dashboard
    ws.send(JSON.stringify(Array.from(clients.entries()).map(([id, client]) => ({ id, stats: client.stats }))));

    // Event listener for dashboard disconnect
    ws.on('close', () => {
      console.log('Dashboard disconnected');
      dashboards.delete(ws);
    });
  } else {
    // Handle client connection (e.g., Geth nodes)
    console.log('New client connected');

    // Store the WebSocket temporarily until we receive the 'hello' message
    let clientWs = ws;

    // Event listener for receiving messages from clients
    ws.on('message', (message) => {
      try {
        const parsedMessage = JSON.parse(message);
        console.log('Parsed message:', parsedMessage);

        if (parsedMessage.emit && Array.isArray(parsedMessage.emit)) {
          const [eventName, eventData] = parsedMessage.emit;

          console.log('EVENT NAME:', eventName);

          switch (eventName) {
            case 'hello':
              // Handle 'hello' event
              clientId = eventData.id;
              clientName = eventData.name;

              console.log('Current clientId:', clientId);

              // Check if the client already exists
              if (clients.has(clientId)) {
                // Update existing client
                clients.get(clientId).ws = clientWs;
                clients.get(clientId).name = clientName;
                console.log(`Client reconnected: ${clientName} (ID: ${clientId})`);
              } else {
                // Add new client
                clients.set(clientId, { ws: clientWs, name: clientName, stats: {} });
                console.log(`New client registered: ${clientName} (ID: ${clientId})`);
              }
              break;

            case 'ping':
              // Respond to ping with a pong
              ws.send(JSON.stringify({ emit: ['pong'] }));
              console.log(`Ping received from ${clientName}, sending pong...`);
              break;

            case 'stats':
              // Handle 'stats' event
              if (clientId) {
                updateStats(clientId, eventData);
                console.log(`Received stats from ${clientName}:`, eventData);
              } else {
                console.log('Client ID is undefined when receiving stats.');
              }
              break;

            case 'ready':
            case 'node-ping':
              // Handle or ignore these events as needed
              break;

            default:
              console.log(`Unknown event: ${eventName}`);
          }
        } else if (parsedMessage.method && parsedMessage.params) {
          const { method, params } = parsedMessage;

          console.log('METHOD:', method);

          switch (method) {
            case 'stats':
              if (clientId) {
                updateStats(clientId, params.stats);
                console.log(`Received stats from ${clientName}:`, params.stats);
              } else {
                console.log('Client ID is undefined when receiving stats.');
              }
              break;

            // Handle other methods as needed

            default:
              console.log(`Unknown method: ${method}`);
          }
        } else {
          console.log('Invalid message format:', parsedMessage);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    // Function to update stats from clients
    async function updateStats(id, newStats) {
      try {
        const client = clients.get(id);
        if (client) {
          client.stats = newStats;
          console.log('Updated stats for', id, ':', newStats);
          // Notify all dashboards of the updated stats
          const updatedData = JSON.stringify({ id, stats: newStats });
          dashboards.forEach((dashboard) => {
            dashboard.send(updatedData);
          });
        } else {
          console.error('Client not found for id:', id);
        }
      } catch (error) {
        console.error('Error updating stats:', error);
      }
    }

    // Event listener for client disconnect
    ws.on('close', () => {
      console.log(`Client disconnected: ${clientId || 'Unknown ID'}`);
      if (clientId && clients.has(clientId)) {
        clients.delete(clientId);
        const disconnectData = JSON.stringify({ id: clientId, disconnected: true });
        dashboards.forEach((dashboard) => {
          dashboard.send(disconnectData);
        });
      }
    });

    // Event listener for errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});

// Function to display connected clients and their stats
setInterval(() => {
  console.log('Connected clients and their stats:');
  clients.forEach((client, id) => {
    console.log(`Client ID: ${id}, Stats:`, client.stats);
  });
}, 10000);
