import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message, AgentPhase } from '../../types';
import { stripEmojis } from '../../utils/stripEmojis';
import Mermaid from '../TestPanel/Mermaid';
import { User, Bot, Clock } from 'lucide-react';

const phaseLabels: Record<AgentPhase, string> = {
  questioning: 'Discovery',
  generating: 'Writing tests',
  reviewing: 'Reviewing script',
  reporting: 'Report',
};

interface Props {
  message: Message;
}

function formatMermaidBlocks(text: string): string {
  // Ensure ```mermaid starts on its own line
  let formatted = text.replace(/([^\n])```mermaid/g, '$1\n```mermaid');
  
  // Format single-line mermaid blocks to multi-line so mermaid can parse them
  const mermaidRegex = /```mermaid([\s\S]*?)```/g;
  formatted = formatted.replace(mermaidRegex, (match, p1) => {
    let content = p1.trim();
    if (!content.includes('\n')) {
      content = content.replace(/;/g, '\n');
    }
    return `\n\`\`\`mermaid\n${content}\n\`\`\`\n`;
  });
  return formatted;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const rawContent = isUser ? message.content : stripEmojis(message.content);
  const content = isUser ? rawContent : formatMermaidBlocks(rawContent);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 px-2 animate-in fade-in slide-in-from-bottom-1 duration-300`}>
      <div className={`flex max-w-[90%] gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center shadow-soft ${
          isUser ? 'bg-brand-500' : 'bg-surface-800 border border-surface-600/30'
        }`}>
          {isUser ? <User size={14} className="text-black" /> : <Bot size={14} className="text-brand-500" />}
        </div>

        {/* Bubble */}
        <div className="flex flex-col space-y-0.5">
          <div className={`flex items-center gap-2 mb-0.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
             <span className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">
                {isUser ? 'You' : 'TestMind'}
             </span>
             {!isUser && message.phase && message.id !== 'welcome' && (
                <span className="px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-500 text-[9px] font-bold uppercase tracking-wider border border-brand-500/20">
                  {phaseLabels[message.phase]}
                </span>
             )}
          </div>

          <div
            className={`relative rounded-xl px-4 py-3 shadow-soft transition-all ${
              isUser
                ? 'bg-brand-500 text-black rounded-tr-none'
                : 'bg-surface-800 text-slate-200 rounded-tl-none border border-surface-600/20'
            }`}
          >
            {isUser ? (
              <p className="text-[13px] font-medium leading-relaxed whitespace-pre-wrap">{content}</p>
            ) : (
              <div className="prose prose-invert prose-xs max-w-none font-sans leading-relaxed prose-p:my-1 prose-pre:my-2 prose-headings:my-2">
                <ReactMarkdown
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const code = String(children).replace(/\n$/, '');
                      
                      if (match && match[1] === 'mermaid') {
                        return <div className="scale-95 origin-top-left"><Mermaid chart={code} /></div>;
                      }
                      
                      return match ? (
                        <div className="rounded-lg overflow-hidden my-3 border border-surface-600/30 shadow-2xl">
                          <SyntaxHighlighter 
                            style={oneDark} 
                            language={match[1]} 
                            PreTag="div"
                            customStyle={{ margin: 0, padding: '1rem', fontSize: '11px' }}
                          >
                            {code}
                          </SyntaxHighlighter>
                        </div>
                      ) : (
                        <code className="bg-surface-900 px-1.5 py-0.5 rounded-md text-brand-500 font-mono text-[10px] border border-surface-600/30" {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            )}
          </div>
          
          <div className={`flex items-center gap-1 text-[9px] text-slate-600 font-medium ${isUser ? 'justify-end' : 'justify-start'}`}>
             <Clock size={9} />
             {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
}
