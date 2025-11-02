import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface PhaseCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  phaseName: string;
  phaseNumber: number;
  totalPhases: number;
  nextPhaseName?: string;
}

/**
 * PhaseCelebration - Celebration modal for phase completion
 * 
 * Features:
 * - Confetti animation on phase completion
 * - Display congratulatory message modal
 * - Add "unlock next phase" visual effect
 * - Use Framer Motion for smooth animations
 * 
 * Requirements: 6.3
 */
export const PhaseCelebration: React.FC<PhaseCelebrationProps> = ({
  isOpen,
  onClose,
  phaseName,
  phaseNumber,
  totalPhases,
  nextPhaseName,
}) => {
  const isLastPhase = phaseNumber === totalPhases;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-purple-500/30">
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Confetti Animation */}
              <ConfettiEffect />
              
              <DialogHeader>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 260, 
                    damping: 20,
                    delay: 0.1 
                  }}
                  className="mx-auto mb-4"
                >
                  <div className="relative">
                    <motion.div
                      animate={{ 
                        rotate: [0, 10, -10, 10, 0],
                        scale: [1, 1.1, 1, 1.1, 1]
                      }}
                      transition={{ 
                        duration: 0.5,
                        repeat: 2,
                        repeatDelay: 0.3
                      }}
                    >
                      <CheckCircle className="w-20 h-20 text-green-400" />
                    </motion.div>
                    <motion.div
                      animate={{ 
                        scale: [0, 1.5, 0],
                        opacity: [0, 1, 0]
                      }}
                      transition={{ 
                        duration: 1,
                        repeat: Infinity,
                        repeatDelay: 1
                      }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <Sparkles className="w-20 h-20 text-yellow-400" />
                    </motion.div>
                  </div>
                </motion.div>
                
                <DialogTitle className="text-center text-2xl font-bold text-white">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    {isLastPhase ? "🎉 Congratulations!" : "🎊 Phase Complete!"}
                  </motion.div>
                </DialogTitle>
                
                <DialogDescription className="text-center text-gray-300">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="space-y-2"
                  >
                    <p className="text-lg">
                      You've completed <span className="font-semibold text-purple-400">{phaseName}</span>!
                    </p>
                    {isLastPhase ? (
                      <p className="text-sm text-gray-400">
                        Amazing work! You've completed all phases of your action plan. 
                        Time to bring your innovation to life! 🚀
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400">
                        Great progress! You're {Math.round((phaseNumber / totalPhases) * 100)}% through your action plan.
                      </p>
                    )}
                  </motion.div>
                </DialogDescription>
              </DialogHeader>
              
              {!isLastPhase && nextPhaseName && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  className="my-4"
                >
                  <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{ 
                          x: [0, 5, 0],
                        }}
                        transition={{ 
                          duration: 1,
                          repeat: Infinity,
                          repeatDelay: 0.5
                        }}
                      >
                        <ArrowRight className="w-5 h-5 text-purple-400" />
                      </motion.div>
                      <div>
                        <p className="text-sm font-semibold text-white">Next Phase Unlocked</p>
                        <p className="text-sm text-gray-400">{nextPhaseName}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <DialogFooter>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="w-full"
                >
                  <Button
                    onClick={onClose}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {isLastPhase ? "View Complete Plan" : "Continue to Next Phase"}
                  </Button>
                </motion.div>
              </DialogFooter>
            </>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

// Confetti Effect Component
const ConfettiEffect: React.FC = () => {
  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
    rotation: Math.random() * 360,
    color: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'][Math.floor(Math.random() * 5)],
  }));
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {confettiPieces.map((piece) => (
        <motion.div
          key={piece.id}
          initial={{ 
            x: `${piece.x}%`,
            y: -20,
            rotate: 0,
            opacity: 1
          }}
          animate={{ 
            y: '110vh',
            rotate: piece.rotation,
            opacity: 0
          }}
          transition={{ 
            duration: piece.duration,
            delay: piece.delay,
            ease: "easeIn"
          }}
          className="absolute w-2 h-2 rounded-sm"
          style={{ 
            backgroundColor: piece.color,
            left: 0,
          }}
        />
      ))}
    </div>
  );
};
