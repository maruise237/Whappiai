"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState, useRef } from "react"
import { Bot, Trash2, ShieldAlert, CheckCircle2 } from "lucide-react"

type Message = {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  isSpam?: boolean
}

const SCENARIOS = [
  {
    name: "welcome",
    messages: [
      { role: "system", content: "Alice a rejoint le groupe" },
      { role: "assistant", content: "Bienvenue Alice ! 👋 Voici les règles du groupe : pas de spam, respect mutuel." },
    ] as Message[],
  },
  {
    name: "moderation",
    messages: [
      { role: "user", content: "Gagnez 1000€ ici: http://spam-link.com", isSpam: true },
      { role: "system", content: "Message supprimé par Whappi (Lien suspect)" },
      { role: "assistant", content: "⚠️ Attention, les liens non autorisés sont interdits." },
    ] as Message[],
  },
  {
    name: "support",
    messages: [
      { role: "user", content: "Comment voir les tarifs ?" },
      { role: "assistant", content: "Vous pouvez consulter nos plans sur /pricing ou taper !tarifs" },
    ] as Message[],
  },
]

export function ChatPreview() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [scenarioIndex, setScenarioIndex] = useState(0)
  const [messageIndex, setMessageIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages, isTyping])

  useEffect(() => {
    let timeout: NodeJS.Timeout

    const processNextStep = () => {
      const currentScenario = SCENARIOS[scenarioIndex]
      
      // If scenario finished
      if (messageIndex >= currentScenario.messages.length) {
        timeout = setTimeout(() => {
          setMessages([]) // Clear chat
          setMessageIndex(0)
          setScenarioIndex((prev) => (prev + 1) % SCENARIOS.length) // Next scenario loop
        }, 3000) // Wait before clearing
        return
      }

      const nextMessage = currentScenario.messages[messageIndex]
      const isLastMessage = messageIndex === currentScenario.messages.length - 1

      // Handle message timing
      if (nextMessage.role === "assistant") {
        setIsTyping(true)
        timeout = setTimeout(() => {
          setIsTyping(false)
          setMessages((prev) => [...prev, { ...nextMessage, id: Math.random().toString() }])
          setMessageIndex((prev) => prev + 1)
        }, 1500) // Typing delay
      } else {
        // User or System message appears faster
        timeout = setTimeout(() => {
          setMessages((prev) => [...prev, { ...nextMessage, id: Math.random().toString() }])
          setMessageIndex((prev) => prev + 1)
        }, 800)
      }
    }

    processNextStep()

    return () => clearTimeout(timeout)
  }, [scenarioIndex, messageIndex])

  return (
    <div className="w-full max-w-[350px] sm:max-w-md mx-auto bg-card border border-border/50 rounded-[2.5rem] shadow-2xl overflow-hidden relative border-[8px] border-zinc-900/10 dark:border-zinc-800/50 ring-1 ring-border/20">
       {/* Fake Phone Notch/Header Area for PC feel */}
       <div className="absolute top-0 left-0 right-0 h-7 bg-card/80 backdrop-blur-md z-20 flex items-center justify-center border-b border-border/10">
          <div className="w-16 h-1 bg-foreground/10 rounded-full" />
       </div>

      {/* Header */}
      <div className="bg-muted/30 p-4 pt-10 flex items-center gap-3 border-b border-border/50 backdrop-blur-sm relative z-10">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
            <Bot size={20} />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-background rounded-full flex items-center justify-center">
             <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-sm leading-tight">Whappi Assistant</h3>
          <p className="text-[10px] text-muted-foreground font-medium">Toujours actif • Répond instantanément</p>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={containerRef}
        className="p-4 space-y-4 h-[400px] overflow-y-auto scrollbar-hide bg-gradient-to-b from-background/50 to-background/80 relative"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={`flex w-full ${
                message.role === "user" 
                  ? "justify-end" 
                  : message.role === "system" 
                    ? "justify-center my-2" 
                    : "justify-start"
              }`}
            >
              {message.role === "system" ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50 text-[10px] text-muted-foreground">
                   {message.content.includes("supprimé") ? <Trash2 size={10} /> : <CheckCircle2 size={10} />}
                   {message.content}
                </div>
              ) : (
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm relative group ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm border border-border/50"
                  } ${message.isSpam ? "opacity-50 blur-[1px] grayscale transition-all duration-500" : ""}`}
                >
                  {message.content}
                  {message.isSpam && (
                     <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-2xl backdrop-blur-[1px] text-destructive font-bold text-xs gap-1">
                        <ShieldAlert size={12} />
                        SPAM DÉTECTÉ
                     </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex justify-start w-full"
            >
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center w-fit border border-border/50">
                <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Input Fake Area */}
      <div className="p-3 bg-card border-t border-border/50 flex items-center gap-2">
         <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <span className="text-lg">+</span>
         </div>
         <div className="h-9 flex-1 bg-muted/50 rounded-full px-4 flex items-center text-xs text-muted-foreground/50">
            Écrivez un message...
         </div>
         <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
         </div>
      </div>
    </div>
  )
}
