import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { PdfProcessingService } from './pdfProcessingService.js';
import { WebSocketMessage } from '../types/index.js';

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private pdfProcessingService: PdfProcessingService;

  constructor() {
    this.pdfProcessingService = new PdfProcessingService();
  }

  initialize(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws: WebSocket, request) => {
      console.log(`🔌 WebSocket client connected from ${request.socket.remoteAddress}`);

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString()) as {
            type: string;
            projectId?: number;
          };

          this.handleWebSocketMessage(ws, message);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            data: { error: 'Invalid message format' }
          }));
        }
      });

      ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        data: { message: 'WebSocket connection established' }
      } as WebSocketMessage));
    });

    console.log('🔌 WebSocket server initialized on /ws');
  }

  private handleWebSocketMessage(ws: WebSocket, message: any) {
    switch (message.type) {
      case 'subscribe':
        if (message.projectId) {
          // Register this client for project updates
          this.pdfProcessingService.registerWebSocketClient(message.projectId, ws);
          ws.send(JSON.stringify({
            type: 'subscribed',
            projectId: message.projectId,
            data: { message: `Subscribed to project ${message.projectId} updates` }
          } as WebSocketMessage));
        }
        break;

      case 'ping':
        ws.send(JSON.stringify({
          type: 'pong',
          data: { timestamp: new Date().toISOString() }
        } as WebSocketMessage));
        break;

      default:
        ws.send(JSON.stringify({
          type: 'error',
          data: { error: 'Unknown message type' }
        } as WebSocketMessage));
    }
  }

  broadcast(message: WebSocketMessage) {
    if (!this.wss) return;

    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  sendToClient(ws: WebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  close() {
    if (this.wss) {
      this.wss.close();
      console.log('🔌 WebSocket server closed');
    }
  }
}