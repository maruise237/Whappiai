"use client"

import { useEffect, useRef, useState } from 'react'

import { api, API_BASE_URL } from '@/lib/api'

export function useWebSocket() {
  const [lastMessage, setLastMessage] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectCountRef = useRef(0)
  const maxReconnectDelay = 30000
  const baseReconnectDelay = 1000

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    let isComponentMounted = true;

    const connect = async () => {
      if (!isComponentMounted) return;

      try {
        const { token } = await api.auth.getWsToken()
        
        if (!isComponentMounted) return;

        // Determine WebSocket URL based on API_BASE_URL or current location
        let wsUrl: string;
        
        // Use the resolved API_BASE_URL if it looks like a full URL
        if (API_BASE_URL && API_BASE_URL.includes('://')) {
          const url = new URL(API_BASE_URL);
          const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
          wsUrl = `${protocol}//${url.host}?token=${token}`;
        } else {
          // Fallback to current location (production or relative)
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          // If we are on port 3011, we know backend is on 3010
          const host = window.location.port === '3011' 
            ? `${window.location.hostname}:3010` 
            : window.location.host;
          wsUrl = `${protocol}//${host}?token=${token}`;
        }

        socket = new WebSocket(wsUrl)
        socketRef.current = socket

        socket.onopen = () => {
          if (!isComponentMounted) return;
          console.log('WebSocket connected')
          setIsConnected(true)
          reconnectCountRef.current = 0 // Reset reconnect count on successful connection
        }

        socket.onmessage = (event) => {
          if (!isComponentMounted) return;
          try {
            const data = JSON.parse(event.data)
            setLastMessage(data)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        socket.onclose = (event) => {
          if (!isComponentMounted) return;
          console.log('WebSocket disconnected, retrying...', event.reason)
          setIsConnected(false)
          
          // Exponential backoff
          const delay = Math.min(
            baseReconnectDelay * Math.pow(2, reconnectCountRef.current),
            maxReconnectDelay
          )
          reconnectCountRef.current += 1
          
          reconnectTimeout = setTimeout(connect, delay)
        }

        socket.onerror = (error) => {
          console.error('WebSocket error:', error)
          // onclose will be called after onerror
        }
      } catch (err) {
        if (!isComponentMounted) return;
        console.error('Failed to get WS token:', err)
        reconnectTimeout = setTimeout(connect, 5000)
      }
    }

    connect()

    return () => {
      isComponentMounted = false;
      if (socket) {
        socket.onclose = null
        socket.onerror = null
        socket.onmessage = null
        socket.onopen = null
        socket.close()
      }
      clearTimeout(reconnectTimeout)
    }
  }, [])

  return { lastMessage, isConnected }
}
