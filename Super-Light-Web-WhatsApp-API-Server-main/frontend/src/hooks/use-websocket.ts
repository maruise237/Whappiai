"use client"

import { useEffect, useRef, useState } from 'react'

import { api } from '@/lib/api'

export function useWebSocket() {
  const [lastMessage, setLastMessage] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = async () => {
      try {
        const { token } = await api.auth.getWsToken()
        
        // Determine WebSocket URL based on current location
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        // In development (Next.js on 3000), connect to backend (Express on 3001)
        const host = window.location.port === '3000' 
          ? `${window.location.hostname}:3001` 
          : window.location.host;
        
        const wsUrl = `${protocol}//${host}?token=${token}`

        socket = new WebSocket(wsUrl)
        socketRef.current = socket

        socket.onopen = () => {
          console.log('WebSocket connected')
          setIsConnected(true)
        }

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            setLastMessage(data)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        socket.onclose = () => {
          console.log('WebSocket disconnected, retrying...')
          setIsConnected(false)
          reconnectTimeout = setTimeout(connect, 3000)
        }

        socket.onerror = (error) => {
          console.error('WebSocket error:', error)
          socket?.close()
        }
      } catch (err) {
        console.error('Failed to get WS token:', err)
        reconnectTimeout = setTimeout(connect, 5000)
      }
    }

    connect()

    return () => {
      if (socket) {
        socket.onclose = null // Prevent reconnect on cleanup
        socket.close()
      }
      clearTimeout(reconnectTimeout)
    }
  }, [])

  return { lastMessage, isConnected }
}
