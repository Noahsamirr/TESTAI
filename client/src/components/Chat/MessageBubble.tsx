import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message, AgentPhase } from '../../types';
import { stripEmojis } from '../../utils/stripEmojis';

const phaseLabels: Record<AgentPhase, string> = {
  questioning: 'Discovery',
  generating: 'Writing tests',
  reviewing: 'Reviewing script',
  reporting: 'Report',
};

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const content = isUser ? message.content : stripEmojis(message.content);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 px-4`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-accent-green text-black rounded-br-sm font-sans'
            : 'bg-surface-700 text-gray-100 rounded-bl-sm text-sm'
        }`}
      >
        {!isUser && message.phase && message.id !== 'welcome' && (
          <span className="inline-block text-xs text-accent-green/90 mb-2 font-sans uppercase tracking-wide">
            {phaseLabels[message.phase]}
          </span>
        )}
        {isUser ? (
          <p className="text-sm leading-relaxed">{content}</p>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none font-sans leading-relaxed">
            <ReactMarkdown
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const code = String(children).replace(/\n$/, '');
                  return match ? (
                    <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div">
                      {code}
                    </SyntaxHighlighter>
                  ) : (
                    <code className="bg-surface-900 px-1 rounded text-accent-green font-mono text-xs" {...props}>
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
        <p className={`text-xs mt-2 ${isUser ? 'text-black/50' : 'text-gray-500'}`}>
          {message.timestamp.toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
