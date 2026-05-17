export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface CompleteParams {
  system?: string;
  messages: ChatMessage[];
  maxTokens: number;
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  complete(params: CompleteParams): Promise<string>;
}
