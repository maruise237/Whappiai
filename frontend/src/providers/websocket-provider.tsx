"use client"

import * as React from "react"
import { api, API_BASE_URL } from "@/lib/api"
import { useAuth } from "@clerk/nextjs"

interface WebSocketContextType {
  lastMessage: any
  isConnected: boolean
}

const WebSocketContext = React.createContext<WebSocketContextType | undefined>(undefined)

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const [lastMessage, setLastMessage] = React.useState<any>(null)
  const [isConnected, setIsConnected] = React.useState(false)
  const socketRef = React.useRef<WebSocket | null>(null)
  const reconnectCountRef = React.useRef(0)
  const maxReconnectDelay = 30000
  const baseReconnectDelay = 1000

  React.useEffect(() => {
    let socket: WebSocket | null = null
    let reconnectTimeout: NodeJS.Timeout
    let isComponentMounted = true

    const connect = async () => {
      if (!isComponentMounted || !isLoaded || !isSignedIn) return

      try {
        const token = await getToken()
        
        if (!isComponentMounted || !token) return

        let wsUrl: string
        
        if (API_BASE_URL && API_BASE_URL.includes('://')) {
          try {
            const url = new URL(API_BASE_URL)
            const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
            // For IP-based URLs, url.host includes the port
            wsUrl = `${protocol}//${url.host}?token=${token}`
          } catch (e) {
            console.error("Invalid API_BASE_URL for WebSocket:", API_BASE_URL)
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
            wsUrl = `${protocol}//${window.location.host}?token=${token}`
          }
        } else {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
          wsUrl = `${protocol}//${window.location.host}?token=${token}`
        }

        socket = new WebSocket(wsUrl)
        socketRef.current = socket

        socket.onopen = () => {
          if (!isComponentMounted) return
          console.log('WebSocket connected (Shared)')
          setIsConnected(true)
          reconnectCountRef.current = 0
        }

        socket.onmessage = (event) => {
          if (!isComponentMounted) return
          try {
            const data = JSON.parse(event.data)
            setLastMessage(data)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        socket.onclose = (event) => {
          if (!isComponentMounted) return
          console.log('WebSocket disconnected, retrying...', event.reason)
          setIsConnected(false)
          
          const delay = Math.min(
            baseReconnectDelay * Math.pow(2, reconnectCountRef.current),
            maxReconnectDelay
          )
          reconnectCountRef.current += 1
          
          reconnectTimeout = setTimeout(connect, delay)
        }

        socket.onerror = (error) => {
          console.error('WebSocket error:', error)
        }
      } catch (err) {
        if (!isComponentMounted) return
        console.error('Failed to get WS token:', err)
        reconnectTimeout = setTimeout(connect, 5000)
      }
    }

    connect()

    return () => {
      isComponentMounted = false
      if (socket) {
        socket.onclose = null
        socket.onerror = null
        socket.onmessage = null
        socket.onopen = null
        socket.close()
      }
      clearTimeout(reconnectTimeout)
    }
  }, [isLoaded, isSignedIn, getToken])

  return (
    <WebSocketContext.Provider value={{ lastMessage, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  const context = React.useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error("useWebSocket must be used within a WebSocketProvider")
  }
  return context
}
