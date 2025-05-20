import {AdaptiveCards} from '@microsoft/adaptivecards-tools';
import {TurnContext} from 'botbuilder';
import {ApplicationTurnState} from '..';
import config from './config';
import {
  ChatMessage,
  //ChatRequest,
  ChatResponse,
  Citation,
  ResponseCard,
  SupportingContent,
  WelcomeCard,
} from './types';
import { chatApiGpt, Approaches, AskResponse, ChatRequest, ChatRequestGpt, ChatTurn } from "../api";
import axios, {AxiosRequestConfig} from 'axios';
import welcomeCard from '../shared/cards/welcome.json';
import responseCard from '../shared/cards/response.json';
import {AdaptiveCard} from '@microsoft/teams-ai';
import { create } from 'domain';

// render an adaptive card from a template and data
export const renderCard = <T extends object>(template: unknown, data: T) => {
  return AdaptiveCards.declare<T>(template).render(data);
};

export const createWelcomeCard = (questions: string[]): AdaptiveCard => {
  return renderCard<WelcomeCard>(welcomeCard, {questions});
};

export const createResponseCard = (data: ResponseCard): AdaptiveCard => {
  return renderCard<ResponseCard>(responseCard, data);
};

// send an adaptive card to the user with suggested actions (if any)
export const sendAdaptiveCard = async (
  context: TurnContext,
  card: unknown,
  suggestions?: string[]
) => {
  await context.sendActivity({
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: card,
      },
    ],
    suggestedActions: {
      to: [context.activity.from.id],
      actions: suggestions?.map(suggestion => {
        return {
          type: 'imBack',
          title: suggestion,
          value: suggestion,
        };
      }),
    },
  });
};

// reset conversation history
export const resetConversationHistory = (state: ApplicationTurnState): void => {
  state.deleteConversationState();
  createConversationHistory(state);
}

// create conversation history if not exists
export const createConversationHistory = (
  state: ApplicationTurnState
): ChatTurn[] =>
  (state.conversation.messages = state.conversation.messages || []);

export const addMessageToConversationHistory = (
  state: ApplicationTurnState,
  message: ChatTurn
): number =>
  state.conversation.messages.push({
    user: message.user,
    bot: message.bot,
  });

export const setConversationId = (
  state: ApplicationTurnState,
  conversation_id: string
): void => {
  state.conversation.conversation_id = conversation_id;
};

// call backend to get chat response
export const makeApiRequestGpt = async (state: ApplicationTurnState, turn: ChatTurn) => {
  const history: ChatTurn[] = state.conversation.messages;
  const request: ChatRequestGpt = {
      history: [...history, { user: turn.user, bot: undefined }],
      approach: Approaches.ReadRetrieveRead,
      conversation_id: state.conversation.conversation_id ?? '',
      query: turn.user,
      overrides: {
          promptTemplate: null,
          excludeCategory: null,
          top: null,
          semanticRanker: true,
          semanticCaptions: false,
          suggestFollowupQuestions: false,
          temperature: 3,
      }
  };
  const result = await chatApiGpt(`${config.appBackendEndpoint}`, request);
  console.log(result);
  console.log(result.answer);
  
  // Check if result.thoughts exists
  if (!result.thoughts) {
      result.thoughts = "No thought process available.";
  }

  return result;
};

// extract citation filenames into array - text [file.pdf][file.pdf] -> ["file.pdf", "file.pdf"]
export const getCitations = (content: string): string[] => {
  const matches = content.match(/\[(.*?)\]/g);
  if (matches) {
    const uniqueMatches = Array.from(
      new Set(matches.map(match => match.slice(1, -1)))
    );
    return uniqueMatches;
  }
  return [];
};

// transform data_points array items from strings to objects - "file.pdf: content" -> [{file: file.pdf, content: content}]
export const getSupportingContent = (
  data_points: string[]
): SupportingContent[] => {
  return data_points.map((value: string) => {
    return {
      filename: value.split(':')[0],
      content: value.split(':').splice(1).join(':').trim(),
    };
  });
};

// replace citations with numbers in reply text - [file.pdf][file.pdf] -> **1** **2**
export const replaceCitations = (
  citations: string[],
  content: string
): string => {
  citations.forEach((citation, index) => {
    const regex = new RegExp(`\\[${citation}\\]`, 'g');
    content = content.replace(regex, `**${index + 1}**`);
  });
  // add space between citations - **1****2** -> **1** **2**
  return content.replace(/\*\*\*\*/g, '** **');
};

// convert citation filenames to objects - ["file.pdf", "file.pdf"] -> [{filename: "file.pdf", url: "https://..."}, {filename: "file.pdf", url: "https://..."}]
export const convertCitations = (citations: string[]): Citation[] => {
  return citations.map(citation => {
    return {
      filename: citation,
      url: `${config.appBackendEndpoint}api/get-blob?blob_name=${citation}`,
    };
  });
};