import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message, AgentPhase } from '../../types';
import { stripEmojis } from '../../utils/stripEmojis';
import Mermaid from '../TestPanel/Mermaid';
import { User, Bot, Clock } from 'lucide-react';

const phaseLabels: Record<AgentPhase, string> = {
  questioning: 'Discovery',
  analyzing: 'Analyzing',
  generating: 'Writing tests',
  reviewing: 'Reviewing script',
  executing: 'Running tests',
  debugging: 'Debugging',
  reporting: 'Report',
  optimizing: 'Optimizing',
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
  let rawContent = isUser ? message.content : stripEmojis(message.content);

  // If assistant response contains full automation script code, strip the heavy script block from chat body
  if (!isUser && (rawContent.includes('SCRIPT:') || rawContent.includes('```typescript') || rawContent.includes('```javascript') || rawContent.includes('```ts'))) {
    rawContent = rawContent.replace(/```(?:typescript|javascript|ts|js)?[\s\S]*?```/g, '\n*(The complete runnable script has been generated and loaded into the **Script Code** tab in your artifacts drawer.)*\n');
    rawContent = rawContent.replace(/SCRIPT:\s*/g, '');
  }

  const content = isUser ? rawContent : formatMermaidBlocks(rawContent);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 px-2 animate-in fade-in slide-in-from-bottom-1 duration-300`}>
      <div className={`flex max-w-[90%] min-w-0 gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center shadow-sm ${
          isUser ? 'bg-indigo-600' : 'bg-orange-500'
        }`}>
          {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
        </div>

        {/* Bubble */}
        <div className="flex flex-col space-y-0.5 min-w-0">
          <div className={`flex items-center gap-2 mb-0.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
             <span className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">
                {isUser ? 'You' : 'TestMind AI'}
             </span>
             {!isUser && message.phase && message.id !== 'welcome' && (
                <span className="badge badge-primary">
                  {phaseLabels[message.phase]}
                </span>
             )}
          </div>

          <div
            className={`relative rounded-2xl px-4 py-3 shadow-sm transition-all break-words ${
              isUser
                ? 'bg-indigo-600 text-white rounded-tr-none'
                : 'bg-white text-slate-800 rounded-tl-none border border-slate-200 shadow-slate-100'
            }`}
          >
            {isUser ? (
              <p className="text-[13px] font-medium leading-relaxed whitespace-pre-wrap break-words">{content}</p>
            ) : (
              <div className="prose prose-slate prose-xs max-w-none font-sans leading-relaxed prose-p:my-1 prose-pre:my-2 prose-headings:my-2 break-words text-slate-800">
                <ReactMarkdown
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const code = String(children).replace(/\n$/, '');
                      
                      if (match && match[1] === 'mermaid') {
                        return <div className="scale-95 origin-top-left"><Mermaid chart={code} /></div>;
                      }
                      
                      return match ? (
                        <div className="rounded-lg overflow-hidden my-3 border border-slate-200 shadow-sm">
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
                        <code className="bg-slate-100 px-1.5 py-0.5 rounded-md text-indigo-700 font-mono text-[10px] border border-slate-200" {...props}>
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
          
          <div className={`flex items-center gap-1 text-[9px] text-slate-400 font-medium ${isUser ? 'justify-end' : 'justify-start'}`}>
             <Clock size={9} />
             {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
}
