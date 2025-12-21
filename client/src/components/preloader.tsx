import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PreloaderProps {
  isLoading?: boolean;
  minDuration?: number;
}

export function Preloader({ isLoading = true, minDuration = 1500 }: PreloaderProps) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setShow(false), minDuration);
      return () => clearTimeout(timer);
    }
  }, [isLoading, minDuration]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-sky-500 via-teal-500 to-cyan-500"
          data-testid="preloader"
        >
          <div className="flex flex-col items-center gap-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl"
              >
                <div className="text-4xl font-bold text-white tracking-tight">
                  GAC
                </div>
              </motion.div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-4 rounded-3xl border-4 border-white/30 border-t-white"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-center"
            >
              <h1 className="text-2xl font-bold text-white mb-1">GAC Trackings</h1>
              <p className="text-white/80 text-sm">Employee Attendance System</p>
            </motion.div>

            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="h-1 bg-white/40 rounded-full overflow-hidden w-48"
            >
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ 
                  duration: 1, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="h-full w-1/2 bg-white rounded-full"
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]" data-testid="page-loader">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary"
      />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl bg-card p-6 animate-pulse" data-testid="card-skeleton">
      <div className="h-2 w-full bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10 rounded-full mb-4" />
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-10 w-10 bg-muted rounded-full" />
      </div>
      <div className="h-8 w-16 bg-muted rounded mb-2" />
      <div className="h-3 w-32 bg-muted rounded" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl bg-card overflow-hidden" data-testid="table-skeleton">
      <div className="h-12 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 border-b border-border animate-pulse flex items-center gap-4 px-4">
          <div className="h-8 w-8 bg-muted rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-3 w-24 bg-muted rounded" />
          </div>
          <div className="h-6 w-16 bg-muted rounded-full" />
        </div>
      ))}
    </div>
  );
}
