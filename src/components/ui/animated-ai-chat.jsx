"use client";

import React, { useEffect, useRef, useCallback, useTransition, useState, forwardRef } from "react";
import { cn } from "../../lib/utils";
import {
    Paperclip,
    SendIcon,
    LoaderIcon,
    Sparkles,
    User,
    Bot,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { chatWithAI } from "../../services/authService";
const syncChannel = new BroadcastChannel('intdoc_sync');

function useAutoResizeTextarea({
    minHeight,
    maxHeight,
}) {
    const textareaRef = useRef(null);

    const adjustHeight = useCallback(
        (reset) => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            if (reset) {
                textarea.style.height = `${minHeight}px`;
                return;
            }

            textarea.style.height = `${minHeight}px`;
            const newHeight = Math.max(
                minHeight,
                Math.min(
                    textarea.scrollHeight,
                    maxHeight ?? Number.POSITIVE_INFINITY
                )
            );

            textarea.style.height = `${newHeight}px`;
        },
        [minHeight, maxHeight]
    );

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = `${minHeight}px`;
        }
    }, [minHeight]);

    useEffect(() => {
        const handleResize = () => adjustHeight();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [adjustHeight]);

    return { textareaRef, adjustHeight };
}

const Textarea = forwardRef(
    ({ className, containerClassName, showRing = true, ...props }, ref) => {
        const [isFocused, setIsFocused] = useState(false);

        return (
            <div className={cn(
                "relative",
                containerClassName
            )}>
                <textarea
                    className={cn(
                        "flex min-h-[60px] w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-3.5 text-base",
                        "transition-all duration-200 ease-in-out shadow-sm",
                        "placeholder:text-white/20 text-white outline-none",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        showRing ? "focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20" : "",
                        className
                    )}
                    ref={ref}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    {...props}
                />
            </div>
        )
    }
)
Textarea.displayName = "Textarea"

export function AnimatedAIChat({ context = "", isFloating = false }) {
    const [value, setValue] = useState("");
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [isPending, startTransition] = useTransition();
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 60,
        maxHeight: 250,
    });

    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSendMessage = async () => {
        if (!value.trim()) return;

        const userQuestion = value.trim();
        setMessages(prev => [...prev, { role: 'user', text: userQuestion }]);
        setValue("");
        adjustHeight(true);
        setIsTyping(true);

        try {
            const answer = await chatWithAI(userQuestion, context || "No context provided");
            setMessages(prev => [...prev, { role: 'ai', text: answer }]);
            syncChannel.postMessage({ type: 'ACTIVITY_UPDATED' });
        } catch (error) {
            console.error('Chat Error:', error);
            setMessages(prev => [...prev, { role: 'ai', text: 'Error: Could not retrieve answer from AI.' }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div
            className={cn(
                "w-full relative z-10 glass-panel p-1 border-opacity-10 shadow-2xl overflow-hidden flex flex-col transition-all duration-500",
                isFloating ? "max-h-[500px] min-h-[400px]" : "max-w-5xl mx-auto my-12 min-h-[700px]"
            )}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-indigo-500/10 pointer-events-none" />

            {/* Chat Header */}
            <div className={cn(
                "border-b border-white/5 bg-white/5 flex items-center justify-between",
                isFloating ? "p-4" : "p-8 md:p-10"
            )}>
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "rounded-xl bg-violet-500/20 border border-violet-500/30",
                        isFloating ? "p-2" : "p-4"
                    )}>
                        <Sparkles className={cn(isFloating ? "w-5 h-5" : "w-10 h-10 md:w-12 md:h-12", "text-violet-400")} />
                    </div>
                    <div>
                        <h3 className={cn(isFloating ? "text-lg" : "text-3xl md:text-4xl", "font-extrabold text-white tracking-tight mb-0.5")}>
                            {isFloating ? "Ask AI" : "Interactive Smart Assistant"}
                        </h3>
                        {!isFloating && <p className="text-base md:text-lg text-white/40 font-medium tracking-wide">Enhanced Contextual Analysis</p>}
                    </div>
                </div>
            </div>

            {/* Message Area */}
            <div className={cn(
                "flex-1 overflow-y-auto space-y-8 scrollbar-thin scrollbar-thumb-white/10",
                isFloating ? "p-4" : "p-8"
            )}>
                {messages.length === 0 && !isTyping && (
                    <div className="flex flex-col items-center justify-center h-full opacity-50 text-white/50 space-y-4">
                        <Bot className="w-12 h-12 text-violet-400 mb-2" />
                        <p>Ask me anything about your document!</p>
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <motion.div
                        key={idx}
                        className={cn(
                            "flex items-start gap-4",
                            msg.role === 'user' ? "flex-row-reverse" : ""
                        )}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                            msg.role === 'user'
                                ? "bg-white/10 border-white/10"
                                : "bg-violet-500/20 border-violet-500/30"
                        )}>
                            {msg.role === 'user' ? <User className="w-5 h-5 text-white/70" /> : <Bot className="w-5 h-5 text-violet-400" />}
                        </div>
                        <div className={cn(
                            "p-5 rounded-2xl max-w-[80%] text-sm leading-relaxed",
                            msg.role === 'user'
                                ? "bg-white/10 text-white"
                                : "bg-white/[0.03] border border-white/5 text-white/90"
                        )}>
                            {msg.text}
                        </div>
                    </motion.div>
                ))}

                {isTyping && (
                    <motion.div className="flex items-start gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-violet-400" />
                        </div>
                        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-2">
                            <span className="text-sm text-violet-400/70 font-medium italic">Assistant is thinking</span>
                            <TypingDots />
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className={cn(
                "border-t border-white/5 bg-white/5 backdrop-blur-md",
                isFloating ? "p-4" : "p-8"
            )}>
                <div className="relative flex items-end gap-4 overflow-visible">
                    <div className="flex-1">
                        <Textarea
                            ref={textareaRef}
                            value={value}
                            onChange={(e) => {
                                setValue(e.target.value);
                                adjustHeight();
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask a clarifying question..."
                            className="bg-black/40 border-white/10 text-base"
                        />
                    </div>

                    <motion.button
                        onClick={handleSendMessage}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        disabled={isTyping || !value.trim()}
                        className={cn(
                            "h-12 w-12 rounded-xl flex items-center justify-center transition-all shadow-xl",
                            value.trim()
                                ? "bg-violet-600 text-white shadow-violet-500/20"
                                : "bg-white/5 text-white/20 border border-white/5"
                        )}
                    >
                        <SendIcon className="w-5 h-5" />
                    </motion.button>
                </div>
            </div>
        </div>
    );
}

function TypingDots() {
    return (
        <div className="flex items-center ml-1">
            {[1, 2, 3].map((dot) => (
                <motion.div
                    key={dot}
                    className="w-1 h-1 bg-violet-400 rounded-full mx-0.5"
                    animate={{
                        opacity: [0.3, 1, 0.3],
                    }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: dot * 0.2,
                    }}
                />
            ))}
        </div>
    );
}
