"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState, useRef } from "react"
import { ArrowLeft, Video, Phone, MoreVertical, Mic, Plus, Camera, Smile } from "lucide-react"

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
      { role: "user", content: "Merci ! Est-ce que je peux poster des liens ?" },
      { role: "assistant", content: "Seulement si c'est pertinent pour la communauté et sans pub ! 😉" },
    ] as Message[],
  },
  {
    name: "moderation",
    messages: [
      { role: "user", content: "Gagnez 1000€ ici: http://spam-link.com", isSpam: true },
      { role: "system", content: "Message supprimé par Whappi (Lien suspect)" },
      { role: "assistant", content: "⚠️ Attention, les liens non autorisés sont interdits." },
      { role: "user", content: "Désolé, je ne savais pas." },
      { role: "assistant", content: "Pas de souci, c'est noté. Merci de respecter les règles ! 🙏" },
    ] as Message[],
  },
  {
    name: "support",
    messages: [
      { role: "user", content: "Comment voir les tarifs ?" },
      { role: "assistant", content: "Vous pouvez consulter nos plans sur /pricing ou taper !tarifs" },
      { role: "user", content: "Il y a un essai gratuit ?" },
      { role: "assistant", content: "Oui ! 14 jours gratuits sans carte bancaire. Tapez !start pour commencer." },
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
    <div className="relative mx-auto w-full max-w-[320px] lg:max-w-[350px]">
      {/* Phone Frame */}
      <div className="relative border-gray-900 bg-gray-900 border-[10px] rounded-[3rem] h-[600px] shadow-2xl overflow-hidden ring-1 ring-white/10">
        
        {/* Side Buttons */}
        <div className="absolute top-24 -left-[14px] w-[4px] h-8 bg-gray-800 rounded-l-md"></div>
        <div className="absolute top-36 -left-[14px] w-[4px] h-14 bg-gray-800 rounded-l-md"></div>
        <div className="absolute top-36 -right-[14px] w-[4px] h-20 bg-gray-800 rounded-r-md"></div>

        {/* Dynamic Island / Notch */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[100px] h-[28px] bg-black rounded-b-[1rem] z-30 flex justify-center items-center">
          <div className="w-12 h-3 bg-gray-900/50 rounded-full" />
        </div>

        {/* Screen Content */}
        <div className="w-full h-full bg-[#0b141a] flex flex-col relative overflow-hidden rounded-[2.2rem]">
          
          {/* WhatsApp Header */}
          <div className="bg-[#202c33] p-3 pt-10 flex items-center justify-between z-20 shadow-md">
            <div className="flex items-center gap-2">
              <ArrowLeft className="text-[#00a884] w-5 h-5 cursor-pointer" />
              <div className="relative">
                <img 
                  src="https://i.ibb.co/1tkgLkgd/Gemini-Generated-Image-1ykssf1ykssf1dyks.png" 
                  alt="Bot" 
                  className="w-9 h-9 rounded-full object-cover"
                />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#00a884] rounded-full border-2 border-[#202c33]"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-100 text-sm font-semibold leading-tight">Whappi Assistant</span>
                <span className="text-[#8696a0] text-[10px] font-medium">En ligne</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[#00a884]">
              <Video className="w-5 h-5" />
              <Phone className="w-4 h-4" />
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 relative bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-opacity-5">
            {/* Gradient Mask for Fade Effect at Bottom */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#0b141a] via-transparent to-transparent h-20 bottom-0 z-10" />

            <div 
              ref={containerRef}
              className="h-full overflow-y-auto p-4 space-y-3 pb-20 scrollbar-hide"
            >
              {/* Encryption Notice */}
              <div className="flex justify-center mb-6 mt-2">
                <div className="bg-[#182229] px-3 py-1.5 rounded-lg shadow-sm max-w-[85%] text-center">
                  <p className="text-[#8696a0] text-[10px] leading-3 flex items-center justify-center gap-1">
                    🔒 Les messages sont chiffrés de bout en bout.
                  </p>
                </div>
              </div>

              <AnimatePresence initial={false} mode="popLayout">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className={`flex w-full ${
                      message.role === "user" 
                        ? "justify-end" 
                        : message.role === "system" 
                          ? "justify-center my-4" 
                          : "justify-start"
                    }`}
                  >
                    {message.role === "system" ? (
                      <div className="bg-[#182229] px-3 py-1 rounded-full text-[#8696a0] text-[10px] font-medium uppercase tracking-wide shadow-sm border border-white/5">
                        {message.content}
                      </div>
                    ) : (
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-1.5 text-sm shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] relative ${
                          message.role === "user"
                            ? "bg-[#005c4b] text-[#e9edef] rounded-tr-none"
                            : "bg-[#202c33] text-[#e9edef] rounded-tl-none"
                        } ${message.isSpam ? "opacity-50 blur-[0.5px]" : ""}`}
                      >
                        {message.content}
                        <div className="text-[9px] text-right mt-1 opacity-60 flex justify-end items-center gap-1">
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {message.role === "user" && (
                            <span className="text-[#53bdeb]">✓✓</span>
                          )}
                        </div>
                        
                        {/* Triangle Tail */}
                        <div className={`absolute top-0 w-0 h-0 border-[6px] border-transparent ${
                          message.role === "user" 
                            ? "-right-[6px] border-t-[#005c4b] border-l-[#005c4b]" 
                            : "-left-[6px] border-t-[#202c33] border-r-[#202c33]"
                        }`} />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing Indicator */}
              <AnimatePresence>
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex justify-start w-full"
                  >
                     <div className="bg-[#202c33] rounded-lg rounded-tl-none px-3 py-2 flex gap-1 items-center border-none shadow-sm relative ml-1">
                        <div className="absolute top-0 -left-[6px] w-0 h-0 border-[6px] border-transparent border-t-[#202c33] border-r-[#202c33]" />
                        <span className="w-1.5 h-1.5 bg-[#8696a0] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-[#8696a0] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-[#8696a0] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                     </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Input Area */}
          <div className="bg-[#202c33] p-2 flex items-center gap-2 z-20">
             <Plus className="text-[#8696a0] w-6 h-6" />
             <div className="flex-1 bg-[#2a3942] rounded-lg h-9 flex items-center px-3 justify-between">
                <span className="text-[#8696a0] text-sm">Message</span>
                <Smile className="text-[#8696a0] w-5 h-5 opacity-70" />
             </div>
             <div className="flex gap-3 pr-1">
                <Camera className="text-[#8696a0] w-5 h-5" />
                <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center">
                  <Mic className="text-white w-4 h-4" />
                </div>
             </div>
          </div>

          {/* Home Indicator */}
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full z-30" />
        </div>
      </div>
    </div>
  )
}
