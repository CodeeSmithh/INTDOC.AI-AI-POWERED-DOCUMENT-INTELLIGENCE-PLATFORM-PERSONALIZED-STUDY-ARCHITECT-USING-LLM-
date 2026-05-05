import { AnimatedAIChat } from "./ui/animated-ai-chat";
import { motion } from "framer-motion";

export function AnimatedAIChatSection({ context, layoutZone = 'inline' }) {
  const getLayoutStyles = () => {
    const baseClasses = "flex w-full transition-all duration-700 ease-in-out px-4 z-[100]";
    
    switch (layoutZone) {
      case 'top-left':
        return { className: `${baseClasses} fixed top-24 left-4 w-96`, style: { zIndex: 1000 } };
      case 'top-right':
        return { className: `${baseClasses} fixed top-24 right-4 w-96`, style: { zIndex: 1000 } };
      case 'bottom-left':
        return { className: `${baseClasses} fixed bottom-4 left-4 w-96`, style: { zIndex: 1000 } };
      case 'bottom-right':
        return { className: `${baseClasses} fixed bottom-4 right-4 w-96`, style: { zIndex: 1000 } };
      case 'center-left':
        return { className: `${baseClasses} fixed top-1/2 -translate-y-1/2 left-4 w-96`, style: { zIndex: 1000 } };
      case 'center-right':
        return { className: `${baseClasses} fixed top-1/2 -translate-y-1/2 right-4 w-96`, style: { zIndex: 1000 } };
      case 'inline':
      default:
        return { className: `${baseClasses} relative mt-12 mb-24`, style: {} };
    }
  };

  const layout = getLayoutStyles();

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={layout.className}
      style={layout.style}
    >
      <AnimatedAIChat context={context} isFloating={layoutZone !== 'inline'} />
    </motion.div>
  );
}
