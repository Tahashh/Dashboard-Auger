import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, AlertCircle, HelpCircle, X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMessage } from '../types';
import { fetchChatMessages, sendChatMessage } from '../api';
import clsx from 'clsx';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface ErrorReportChatProps {
  username: string;
  socket: WebSocket | null;
}

const ErrorReportChat: React.FC<ErrorReportChatProps> = ({ username, socket }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const data = await fetchChatMessages(username);
        setMessages(data);
      } catch (error) {
        console.error('Error loading chat messages:', error);
        toast.error('Errore nel caricamento dei messaggi');
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [username]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'chat_message' && data.message) {
          setMessages(prev => {
            if (prev.find(m => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
        }
      } catch (e) {
        console.error('Error parsing WS message in chat:', e);
      }
    };

    socket.addEventListener('message', handleMessage);
    return () => socket.removeEventListener('message', handleMessage);
  }, [socket]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const text = inputText.trim();
    setInputText('');

    try {
      const newMessage = await sendChatMessage(username, text);
      // The message will be added to the state by the WS broadcast if we broadcast to ourselves too,
      // but the server code I wrote broadcasts to OTHER users. 
      // Actually, my server code broadcasts to ALL authorized users including the sender if they are in the list.
      // Let's check the server code again.
      // wss.clients.forEach(client => { ... if (client.readyState === WebSocket.OPEN && session && CHAT_AUTHORIZED_USERS.includes(session.username)) { client.send(broadcastMsg); } });
      // Yes, it broadcasts to everyone authorized. So we might get a duplicate if we add it here.
      // But usually it's better to add it optimistically or wait for the server response.
      // My server code also re-broadcasts when receiving a WS message.
      // Let's just rely on the server response for the sender to avoid duplicates if the WS broadcast hits the sender too.
      // Actually, to be safe and responsive:
      setMessages(prev => {
        if (prev.find(m => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Errore nell\'invio del messaggio');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Segnala Errori</h2>
            <p className="text-xs text-slate-500">Chat privata tra LucaTurati e TahaJbala</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded text-[10px] font-bold uppercase tracking-wider border border-amber-100">
            <AlertCircle className="w-3 h-3" />
            <span>Segnalazioni</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-[10px] font-bold uppercase tracking-wider border border-blue-100">
            <HelpCircle className="w-3 h-3" />
            <span>Dubbi</span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
            <MessageSquare className="w-12 h-12 opacity-20" />
            <p className="text-sm italic">Nessun messaggio. Inizia la conversazione.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender === username;
            const showSender = index === 0 || messages[index - 1].sender !== msg.sender;
            
            return (
              <motion.div
                key={msg.id || index}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={clsx(
                  "flex flex-col",
                  isMe ? "items-end" : "items-start"
                )}
              >
                {showSender && (
                  <span className="text-[10px] font-bold text-slate-400 mb-1 px-1 uppercase tracking-tighter">
                    {msg.sender}
                  </span>
                )}
                <div
                  className={clsx(
                    "max-w-[80%] px-4 py-2 rounded-2xl shadow-sm relative",
                    isMe 
                      ? "bg-indigo-600 text-white rounded-tr-none" 
                      : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                  <div className={clsx(
                    "text-[9px] mt-1 flex justify-end",
                    isMe ? "text-indigo-200" : "text-slate-400"
                  )}>
                    {format(new Date(msg.timestamp), 'HH:mm', { locale: it })}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 p-4">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <div className="flex-1 relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Scrivi un messaggio o segnala un errore..."
              className="w-full bg-slate-100 border-none rounded-2xl px-4 py-3 pr-12 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none max-h-32 custom-scrollbar"
              rows={1}
            />
            <div className="absolute right-3 bottom-3 text-slate-400">
              <User className="w-4 h-4 opacity-30" />
            </div>
          </div>
          <button
            type="submit"
            disabled={!inputText.trim()}
            className={clsx(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md",
              inputText.trim() 
                ? "bg-indigo-600 text-white hover:bg-indigo-700 scale-105 active:scale-95" 
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <p className="text-[10px] text-center text-slate-400 mt-2">
          I messaggi sono visibili solo a LucaTurati e TahaJbala.
        </p>
      </div>
    </div>
  );
};

export default ErrorReportChat;
