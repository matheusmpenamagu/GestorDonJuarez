import { useEffect, useState } from 'react';
import { wsManager } from '@/lib/websocketManager';

export interface WebSocketData {
  type: string;
  data: any;
  timestamp?: string;
}

export function useWebSocket(url: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketData | null>(null);

  useEffect(() => {
    // Update connection status
    setIsConnected(wsManager.isConnected());
    
    // Add listener for messages
    const unsubscribe = wsManager.addListener((data: WebSocketData) => {
      setLastMessage(data);
      setIsConnected(true); // Update connection status when receiving messages
    });

    // Check connection status periodically
    const statusCheckInterval = setInterval(() => {
      setIsConnected(wsManager.isConnected());
    }, 2000);

    // Cleanup on component unmount
    return () => {
      unsubscribe();
      clearInterval(statusCheckInterval);
    };
  }, [url]);

  const sendMessage = (data: any) => {
    wsManager.sendMessage(data);
  };

  return {
    isConnected,
    lastMessage,
    sendMessage,
  };
}
