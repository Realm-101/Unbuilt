import React, { useEffect, useRef, ReactNode } from 'react';
import { useCollaboration } from '@/hooks/useCollaboration';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, MessageCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollaborationProviderProps {
  roomId: string;
  children: ReactNode;
}

export function CollaborationProvider({ roomId, children }: CollaborationProviderProps) {
  const {
    isConnected,
    participants,
    typingUsers,
    sendCursorUpdate,
  } = useCollaboration(roomId);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const lastCursorUpdate = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      // Throttle cursor updates to 60fps
      if (now - lastCursorUpdate.current < 16) return;
      lastCursorUpdate.current = now;

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        sendCursorUpdate({ x, y });
      }
    };

    const handleMouseLeave = () => {
      sendCursorUpdate({ x: -1, y: -1 });
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [sendCursorUpdate]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Connection Status */}
      <div className="fixed top-20 right-4 z-50 flex items-center gap-2">
        <AnimatePresence>
          {isConnected && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-2"
            >
              <Badge variant="outline" className="gap-1.5">
                <Circle className={cn(
                  "w-2 h-2 fill-current",
                  isConnected ? "text-green-500" : "text-gray-400"
                )} />
                {isConnected ? "Connected" : "Connecting..."}
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Participant Avatars */}
      <div className="fixed top-20 right-40 z-50">
        <AnimatePresence>
          {participants.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2"
            >
              <div className="flex -space-x-2">
                {participants.slice(0, 5).map((participant) => (
                  <Avatar
                    key={participant.userId}
                    className="w-8 h-8 border-2 border-background"
                    style={{ borderColor: participant.color }}
                  >
                    <AvatarFallback
                      className="text-xs"
                      style={{ backgroundColor: participant.color }}
                    >
                      {participant.userName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {participants.length > 5 && (
                <Badge variant="secondary">+{participants.length - 5}</Badge>
              )}
              <Badge variant="outline" className="gap-1">
                <Users className="w-3 h-3" />
                {participants.length}
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Typing Indicators */}
      <AnimatePresence>
        {typingUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border"
          >
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {typingUsers.map(u => u?.userName).join(', ')}
              {typingUsers.length === 1 ? ' is' : ' are'} typing...
            </span>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
                  animate={{
                    y: [0, -4, 0],
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Cursors */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <AnimatePresence>
          {participants.map((participant) => {
            if (!participant.cursor || participant.cursor.x < 0 || participant.cursor.y < 0) {
              return null;
            }
            
            return (
              <motion.div
                key={participant.userId}
                className="absolute flex items-start gap-1 pointer-events-none"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  left: `${participant.cursor.x}%`,
                  top: `${participant.cursor.y}%`,
                }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{
                  type: "spring",
                  damping: 30,
                  stiffness: 300,
                }}
                style={{ zIndex: 1000 }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
                >
                  <path
                    d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
                    fill={participant.color}
                    stroke="white"
                    strokeWidth="1"
                  />
                </svg>
                <Badge
                  variant="secondary"
                  className="text-xs px-1.5 py-0.5"
                  style={{
                    backgroundColor: participant.color,
                    color: 'white',
                    borderColor: participant.color,
                  }}
                >
                  {participant.userName}
                </Badge>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Main Content */}
      {children}
    </div>
  );
}