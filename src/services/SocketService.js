// Socket.IO Service for real-time step tracking
import { io } from 'socket.io-client';

const SERVER_URL = 'https://videosdownloaders.com:3000';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.onStepAckCallback = null;
  }

  // Connect to Socket.IO server
  connect() {
    return new Promise((resolve, reject) => {
      try {
        if (this.socket && this.isConnected) {
          console.log('Socket already connected');
          resolve(true);
          return;
        }

        console.log('Connecting to Socket.IO server:', SERVER_URL);

        this.socket = io(SERVER_URL, {
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 3000,
        });

        this.socket.on('connect', () => {
          console.log('✅ Socket.IO connected, ID:', this.socket.id);
          this.isConnected = true;
          resolve(true);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('❌ Socket.IO disconnected:', reason);
          this.isConnected = false;
        });

        this.socket.on('connect_error', (error) => {
          console.log('❌ Socket.IO connection error:', error.message);
          reject(error);
        });

        // Listen for step acknowledgment
        this.socket.on('step_ack', (data) => {
          console.log('✅ step_ack received:', JSON.stringify(data));
          if (this.onStepAckCallback) {
            this.onStepAckCallback(data);
          }
        });

        // Listen for server errors
        this.socket.on('server_error', (data) => {
          console.log('❌ server_error:', JSON.stringify(data));
        });

        // Set timeout for connection
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);

      } catch (error) {
        console.log('Socket connection error:', error);
        reject(error);
      }
    });
  }

  // Send step event to server
  sendStepEvent(data) {
    if (!this.socket || !this.isConnected) {
      console.log('Socket not connected, cannot send step event');
      return false;
    }

    try {
      console.log('📤 Sending step_event:', JSON.stringify(data));
      this.socket.emit('step_event', data);
      return true;
    } catch (error) {
      console.log('Error sending step event:', error);
      return false;
    }
  }

  // Set callback for step acknowledgment
  onStepAck(callback) {
    this.onStepAckCallback = callback;
  }

  // Disconnect from Socket.IO server
  disconnect() {
    console.log('Disconnecting Socket.IO...');

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    this.onStepAckCallback = null;
  }

  // Check if connected
  getIsConnected() {
    return this.isConnected;
  }
}

// Export singleton instance
export default new SocketService();
