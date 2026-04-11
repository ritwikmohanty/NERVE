/**
 * MessagePreviewCard — Shows the generated outreach message with typing animation.
 */
import { motion } from 'framer-motion';
import { Pen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNerve } from '@/store/nerve-context';

export function MessagePreviewCard() {
  const { state } = useNerve();

  // Highlight dynamic variables
  const highlightedMessage = state.messageVisible
    .replace(/(Acme Corp|Series B|Sarah|Tuesday at 10|LinkedIn|60%)/g, '⟨$1⟩');

  return (
    <Card className="border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-white/50 flex items-center gap-2">
          <Pen className="w-3.5 h-3.5 text-green-400" />
          Message Preview
          {state.isTyping && (
            <span className="ml-auto text-[9px] text-purple-400 animate-pulse">
              Generating…
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!state.messageVisible ? (
          <p className="text-[11px] text-white/20">Waiting for Content Forge…</p>
        ) : (
          <ScrollArea className="h-[160px] pr-3">
            <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
              <pre className="text-[11px] text-white/50 whitespace-pre-wrap font-sans leading-relaxed">
                {highlightedMessage.split(/(⟨[^⟩]+⟩)/g).map((part, i) => {
                  if (part.startsWith('⟨') && part.endsWith('⟩')) {
                    return (
                      <motion.span
                        key={i}
                        className="text-purple-300 bg-purple-500/10 px-1 rounded"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        {part.slice(1, -1)}
                      </motion.span>
                    );
                  }
                  return <span key={i}>{part}</span>;
                })}
                {state.isTyping && (
                  <span className="inline-block w-0.5 h-3.5 bg-purple-400 ml-0.5 -mb-0.5 animate-blink" />
                )}
              </pre>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
