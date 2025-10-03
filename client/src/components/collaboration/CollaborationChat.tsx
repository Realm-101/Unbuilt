import React, { useState, useRef, useEffect } from 'react';
import { useCollaboration } from '@/hooks/useCollaboration';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Send, X, Minimize2, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ChatMessage } from '@/types';

interface CollaborationChatProps {
  roomId: string;
}

export function CollaborationChat({ roomId }: CollaborationChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    messages,
    participants,
    sendChatMessage,
    sendTyping,
  } = useCollaboration(roomId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    
    // Reset unread count when chat is opened
    if (isOpen) {
      setUnreadCount(0);
    } else if (messages.length > 0) {
      // Increment unread count when chat is closed and new messages arrive
      setUnreadCount(prev => prev + 1);
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (message.trim()) {
      sendChatMessage(message.trim());
      setMessage('');
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = () => {
    sendTyping(true);
  };

  const getParticipantColor = (userId: number) => {
    const participant = participants.find(p => p.userId === userId);
    return participant?.color || '#999';
  };

  const getParticipantName = (userId: number) => {
    const participant = participants.find(p => p.userId === userId);
    return participant?.userName || `User ${userId}`;
  };

  if (!isOpen) {
    return (
      <motion.div
        className="fixed bottom-4 left-4 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full shadow-lg relative"
        >
          <MessageCircle className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "fixed bottom-4 left-4 z-50",
            isMinimized ? "w-80" : "w-96"
          )}
        >
          <Card className={cn(
            "shadow-xl border",
            isMinimized ? "h-14" : "h-[500px]"
          )}>
            <CardHeader className="p-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Team Chat
                {participants.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({participants.length} online)
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  {isMinimized ? (
                    <Maximize2 className="w-3 h-3" />
                  ) : (
                    <Minimize2 className="w-3 h-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </CardHeader>
            
            {!isMinimized && (
              <>
                <CardContent className="p-0 flex-1">
                  <ScrollArea className="h-[380px] px-3" ref={scrollRef}>
                    <div className="space-y-3 py-3">
                      {messages.map((msg, index) => {
                        const isSystem = msg.type === 'system';
                        const color = getParticipantColor(msg.userId);
                        const name = getParticipantName(msg.userId);
                        const time = format(new Date(msg.timestamp), 'HH:mm');
                        
                        if (isSystem) {
                          return (
                            <div
                              key={index}
                              className="text-center text-xs text-muted-foreground py-1"
                            >
                              {msg.message}
                            </div>
                          );
                        }
                        
                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-start gap-2"
                          >
                            <Avatar className="w-7 h-7 mt-0.5">
                              <AvatarFallback
                                className="text-xs"
                                style={{ backgroundColor: color }}
                              >
                                {name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2">
                                <span 
                                  className="text-xs font-semibold"
                                  style={{ color }}
                                >
                                  {name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {time}
                                </span>
                              </div>
                              <p className="text-sm break-words mt-0.5">
                                {msg.message}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
                
                <CardFooter className="p-3 border-t">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                    className="flex gap-2 w-full"
                  >
                    <Input
                      ref={inputRef}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      onInput={handleTyping}
                      placeholder="Type a message..."
                      className="flex-1"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!message.trim()}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </CardFooter>
              </>
            )}
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}