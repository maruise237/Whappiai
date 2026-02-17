"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { Bot, User } from "lucide-react"

const messages = [
  {
    id: 1,
    role: "user",
    content: "Salut, comment fonctionne l'API ?",
  },
  {
    id: 2,
    role: "assistant",
    content: "Bonjour ! 👋 L'API Whappi permet d'automatiser vos messages et groupes WhatsApp simplement. Voulez-vous un exemple ?",
  },
  {
    id: 3,
    role: "user",
    content: "Oui, pour la modération svp.",
  },
  {
    id: 4,
    role: "assistant",
    content: "Bien sûr ! Je peux supprimer les spams et accueillir les nouveaux membres automatiquement. 🛡️",
  },
]

export function ChatPreview() {
  const [visibleMessages, setVisibleMessages] = useState<number>(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleMessages((prev) => (prev < messages.length ? prev + 1 : prev))
    }, 1500)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full max-w-md mx-auto bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-primary/10 p-4 flex items-center gap-3 border-b border-border">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
          <Bot size={18} />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Whappi Assistant</h3>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">En ligne</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="p-4 space-y-4 min-h-[350px] bg-background/50 backdrop-blur-sm flex flex-col justify-end">
        {messages.slice(0, visibleMessages).map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4 }}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-muted text-foreground rounded-tl-sm"
              }`}
            >
              {message.content}
            </div>
          </motion.div>
        ))}
        
        {/* Typing indicator */}
        {visibleMessages < messages.length && (
           <motion.div
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, scale: 0.9 }}
             className="flex justify-start"
           >
             <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center w-fit">
               <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
               <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
               <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
             </div>
           </motion.div>
        )}
      </div>
    </div>
  )
}
