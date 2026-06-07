"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState, useRef } from "react"
import { ArrowLeft, Video, Phone, MoreVertical, Mic, Plus, Camera, Smile, Ban } from "lucide-react"
import { useTranslation } from "react-i18next"

type Message = {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  isSpam?: boolean
  isDeleted?: boolean
}

const SCENARIOS = [
  {
    name: "welcome",
    messages: [
      { role: "system", content: "Amina a rejoint le groupe" },
      { role: "assistant", content: "Bienvenue Amina. Lis les règles épinglées : respect, pas de pub, pas de liens sans accord." },
      { role: "user", content: "Merci, je viens pour suivre les annonces." },
      { role: "assistant", content: "Parfait. Les rappels importants seront publiés ici automatiquement." },
    ] as Message[],
  },
  {
    name: "moderation",
    messages: [
      { role: "user", content: "Gagnez 50 000 FCFA ici: http://spam-link.com", isSpam: true },
      { role: "system", content: "Ce message a été supprimé", isDeleted: true },
      { role: "assistant", content: "Attention @Membre, les liens non autorisés sont interdits. Avertissement 1/3." },
      { role: "user", content: "Désolé, je ne savais pas." },
      { role: "assistant", content: "Merci de respecter les règles du groupe." },
    ] as Message[],
  },
  {
    name: "warnings",
    messages: [
      { role: "user", content: "Encore une pub : rejoignez mon canal maintenant", isSpam: true },
      { role: "assistant", content: "@Membre avertissement 3/3. Exclusion automatique appliquée." },
      { role: "system", content: "Whappi a retiré @Membre du groupe" },
      { role: "assistant", content: "Action enregistrée dans les logs de modération." },
    ] as Message[],
  },
  {
    name: "scheduled",
    messages: [
      { role: "assistant", content: "Rappel : réunion de coordination ce soir à 20h. Merci d'être à l'heure." },
      { role: "user", content: "Bien reçu." },
      { role: "system", content: "Message programmé envoyé dans 4 groupes" },
      { role: "assistant", content: "Prochain rappel prévu demain à 08h00." },
    ] as Message[],
  },
]

interface ChatPreviewProps {
  onScenarioChange?: (index: number) => void
  selectedIndex?: number
}

export function ChatPreview({ onScenarioChange, selectedIndex }: ChatPreviewProps) {
  const { t } = useTranslation('landing')
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [scenarioIndex, setScenarioIndex] = useState(0)
  const [messageIndex, setMessageIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync with external selection (e.g. user clicked a feature card)
  useEffect(() => {
    if (selectedIndex !== undefined && selectedIndex !== scenarioIndex) {
      setScenarioIndex(selectedIndex)
      setMessages([])
      setMessageIndex(0)
      setIsTyping(false)
    }
  }, [selectedIndex])

  // Notify parent of scenario change
  useEffect(() => {
    onScenarioChange?.(scenarioIndex)
  }, [scenarioIndex, onScenarioChange])

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
      <div 
        className="relative border-gray-900 bg-gray-900 border-[10px] rounded-[3rem] h-[580px] shadow-2xl overflow-hidden ring-1 ring-white/10"
        style={{
          maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%)"
        }}
      >
        
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
                  src="/avatars/avatar1.webp"
                  alt="Bot" 
                  className="w-9 h-9 rounded-full object-cover"
                />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#00a884] rounded-full border-2 border-[#202c33]"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-100 text-sm font-semibold leading-tight">{t('chat_admin_name')}</span>
                <span className="text-[#8696a0] text-[10px] font-medium">{t('chat_admin_status')}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[#00a884]">
              <Video className="w-5 h-5" />
              <Phone className="w-4 h-4" />
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 relative bg-[url('/backgrounds/bg1.webp')] bg-repeat bg-opacity-5">
            
            <div 
              ref={containerRef}
              className="h-full overflow-y-auto p-4 space-y-3 pb-24 scrollbar-hide"
            >
              {/* Encryption Notice */}
              <div className="flex justify-center mb-6 mt-2">
                <div className="bg-[#182229] px-3 py-1.5 rounded-lg shadow-sm max-w-[85%] text-center">
                  <p className="text-[#8696a0] text-[10px] leading-3 flex items-center justify-center gap-1">
                     🔒  {t('chat_encryption')}
                  </p>
                </div>
              </div>

              <AnimatePresence initial={false} mode="popLayout">
                {messages.map((message, idx) => (
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
                    {message.isDeleted ? (
                        <div className="flex items-center gap-1.5 text-[#8696a0] italic text-[11px] my-1 px-3 py-1.5 rounded-full bg-[#182229] border border-white/5 shadow-sm">
                          <Ban className="w-3 h-3" />
                          <span>{message.content}</span>
                        </div>
                      ) : message.role === "system" ? (
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
                <span className="text-[#8696a0] text-sm">{t('chat_input_placeholder')}</span>
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
