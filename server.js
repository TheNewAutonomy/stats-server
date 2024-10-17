// Import necessary libraries
const http = require('http');
const WebSocket = require('ws');
const express = require('express');
const path = require('path');

// Server configuration
const PORT = process.env.PORT || 3000;
console.log("Port: " + process.env.PORT);

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
    let clientId = null;

    // Event listener for receiving messages from clients
    ws.on('message', (message) => {
      try {
        const parsedMessage = JSON.parse(message);
        console.log('Parsed message:', parsedMessage);

        if (parsedMessage.method && parsedMessage.params) {
          const { method, params } = parsedMessage;
          switch (method) {
            case 'hello':
              // Set clientId from the hello message
              if (params && params.id) {
                clientId = params.id;

                // If a client with this id already exists, replace it with the new connection
                if (clients.has(clientId)) {
                  console.log(`Client ${clientId} reconnected. Replacing old connection.`);
                  clients.get(clientId).ws.close();
                }

                clients.set(clientId, { ws, stats: {} });
                console.log(`New client registered: ${clientId}`);
              } else {
                console.error('Hello message does not contain an id.');
              }
              break;

            case 'ready':
              if (clientId) {
                console.log(`Client ${clientId} is ready`);
              } else {
                console.error('Client ID not set. Ignoring ready message.');
              }
              break;

            case 'stats':
              if (clientId && params && typeof params === 'object' && params.stats) {
                updateStats(clientId, params.stats);
                console.log(`Received stats from ${clientId}:`, params.stats);
              } else {
                console.log('Invalid stats message format:', params);
              }
              break;

            case 'node-ping':
              if (clientId) {
                console.log(`Received node-ping from ${clientId}:`, params);
              } else {
                console.error('Client ID not set. Ignoring node-ping message.');
              }
              break;

            default:
              console.log('Unknown message type:', method);
          }
        } else {
          console.log('Unknown message format:', parsedMessage);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    // Event listener for client disconnect
    ws.on('close', () => {
      if (clientId) {
        console.log(`Client disconnected: ${clientId}`);
        clients.delete(clientId);
        // Notify dashboards that the client has disconnected
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

// Function to update client stats and notify dashboards
async function updateStats(id, newStats) {
  console.log('Stats Id:', id);
  console.log(newStats);
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

// Function to display connected clients and their stats periodically
setInterval(() => {
  console.log('Connected clients and their stats:');
  clients.forEach((client, id) => {
    console.log(`Client ID: ${id}, Stats:`, client.stats);
  });
}, 10000);
