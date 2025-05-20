export type WelcomeCard = {
  questions: string[];
};

export type ResponseCard = {
  answer: string;
  citations: Citation[];
  supportingContent: SupportingContent[];
};

export type Citation = {
  filename: string;
  url: string;
};

export type SupportingContent = {
  filename: string;
  content: string;
};

export type ChatOverrides = {
  exclude_category: string | null;
  prompt_template: string | null;
  prompt_template_prefix: string | null;
  prompt_template_suffix: string | null;
  semantic_captions: boolean;
  semantic_ranker: boolean;
  suggest_followup_questions: boolean;
  temperature: number;
  top: number | null;
};

export type ChatMessage = {
  content: string;
  role: string;
};

export type ChatRequest = {
  approach: string;
  conversation_id: string | null;
  overrides: ChatOverrides;
  history: ChatMessage[];
  query: string;
};

export type ChatResponse = {
  conversation_id: string;
  answer: string;
  current_state: string;
  thoughts: string | null;
  data_points: string[];
  transaction_data?: string | null;
  error?: string;
};

export type ChatChoice = {
  content_filter_results: ContentFilterResults;
  context: ChatResponseContext;
  finish_reason: string;
  index: number;
  message: ChatMessage;
  session_state: string | null;
};

export type ContentFilterResults = {
  hate: ContentFilterResult;
  self_harm: ContentFilterResult;
  sexual: ContentFilterResult;
  violence: ContentFilterResult;
};

export type ContentFilterResult = {
  filtered: boolean;
  severity: string;
};

export type ChatResponseContext = {
  data_points: DataPoints;
  followup_questions: string[];
  thoughts: string;
};

export type DataPoints = {
  text: string[];
};

export type ChatRequestContext = {
  overrides: ChatOverrides;
};

export type ChatPromptFilterResult = {
  content_filter_results: ContentFilterResults;
  prompt_index: number;
};

export type ChatUsage = {
  completion_tokens: number;
  prompt_tokens: number;
  total_tokens: number;
};

export type ActionData = {
  displayText: string;
  text: string;
};
