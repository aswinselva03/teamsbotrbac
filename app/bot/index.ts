import {ActivityTypes, AdaptiveCardInvokeValue, TurnContext, CardFactory} from 'botbuilder';
import {AdaptiveCard, Application} from '@microsoft/teams-ai';
import {ApplicationTurnState} from '..';
import {
  resetConversationHistory,
  //getChatResponse,
  makeApiRequestGpt,
  getCitations,
  getSupportingContent,
  sendAdaptiveCard,
  replaceCitations,
  createConversationHistory,
  addMessageToConversationHistory,
  setConversationId,
  convertCitations,
  createWelcomeCard,
  createResponseCard,
} from '../shared/helpers';
import {ChatTurn} from '../api';

import {ActionData, ResponseCard} from '../shared/types';
import {constants} from '../shared/constants';
const oauthCard = CardFactory.oauthCard('teamsbotsso');

// Function to convert HTML to Markdown
function convertHtmlToMarkdown(html) {
  // Convert bold HTML tags to Markdown
  let markdown = html.replace(/<strong>(.*?)<\/strong>/g, '**$1**');

  // Convert italic HTML tags to Markdown
  markdown = markdown.replace(/<em>(.*?)<\/em>/g, '*$1*');

  return markdown;
}

const setup = (app: Application) => {
  app.activity(
    ActivityTypes.InstallationUpdate,
    async (context: TurnContext) => {
      const card = createWelcomeCard(constants.questions);
      await sendAdaptiveCard(context, card);
    }
  );

  app.message(
    'New chat',
    async (context: TurnContext, state: ApplicationTurnState) => {
      resetConversationHistory(state);
      await context.sendActivity(
        "New chat session started - Previous messages won't be used as context for new queries"
      );
      const card = createWelcomeCard(constants.questions);
      await sendAdaptiveCard(context, card);
    }
  );

  // app.adaptiveCards.actionExecute(
  //   'example',
  //   async (context: TurnContext, state: ApplicationTurnState) => {
  //     const {action} = context.activity.value as AdaptiveCardInvokeValue;
  //     const {text} = action.data as ActionData;

  //     resetConversationHistory(state);
  //     await processMessage(text, context, state);

  //     const card = createWelcomeCard(constants.questions);
  //     return card as AdaptiveCard;
  //   }
  // );

  app.adaptiveCards.actionExecute(
    'example',
    async (context: TurnContext, state: ApplicationTurnState) => {
      const {action} = context.activity.value as AdaptiveCardInvokeValue;
      const {text} = action.data as ActionData;

      resetConversationHistory(state);

      const data: ResponseCard = {
        answer: text,
        citations: null,
        supportingContent: null,
      };

      const restateCard = createResponseCard(data);

      await sendAdaptiveCard(context, restateCard);

      await processMessage(text, context, state);

      const card = createWelcomeCard(constants.questions);
      return card as AdaptiveCard;
    }
  );

// inside your setup(app) function or similar:

app.activity(ActivityTypes.Invoke, async (context: TurnContext, state: ApplicationTurnState) => {
  if (context.activity.name === 'signin/tokenExchange') {
    console.log('Received signin/tokenExchange invoke');

    // This will have the token exchange info populated by the middleware
    const tokenExchangeState = context.turnState.get('TeamsSSOTokenExchange');

    if (tokenExchangeState) {
      console.log('Token exchange successful:', tokenExchangeState);

      // You can now get the token from the tokenExchangeState
      const token = tokenExchangeState.token;

      await context.sendActivity('Token exchange successful! You are signed in.');
      // Now you can save the token in state or use it as needed.
    } else {
      console.log('Token exchange state is missing or invalid');
      // Respond with a failure to Teams to retry token exchange if needed
      await context.sendActivity({
        type: 'invokeResponse',
        value: {
          status: 412, // Precondition Failed - token exchange failed
          body: 'Token exchange failed'
        }
      });
      return; // stop processing
    }
  }
});
  app.activity(
    ActivityTypes.Message,
    async (context: TurnContext, state: ApplicationTurnState) => {
      const {text} = context.activity;
      const tokenExchangeState = context.turnState.get('TeamsSSOTokenExchange');
      console.log(`token exchange state ${tokenExchangeState}`)
      // const token = tokenExchangeState?.token;
      // const tokenResponse = await context.adapter.getUserToken(context, 'teamsbotsso');
// const tokenExchangeState = context.turnState.get('TeamsSSOTokenExchange');
    let token = tokenExchangeState?.token;

    if (!token) {
      // No token found — send OAuthCard to start sign-in flow
      await context.sendActivity({
        attachments: [CardFactory.oauthCard(connectionName)]
      });
      return; // stop further processing until user signs in
    }

      await context.sendActivity(`Access token: ${tokenResponse}`);
      // await processMessage(text, context, state);
    }
  );
};

const processMessage = async (
  text: string,
  context: TurnContext,
  state: ApplicationTurnState
) => {
  await context.sendActivity({type: 'typing'});
  const user = context.activity.from;
  console.log('User Info:', {
    name: user.name,
    id: user.id,
    aadObjectId: user.aadObjectId,
    role: user.role,
  });

  if (
    state.conversation === undefined ||
    state.conversation === null ||
    state.conversation.messages === undefined ||
    state.conversation.messages === null
  ) {
    createConversationHistory(state);
  }

  var turn: ChatTurn = {
    user: text,
    bot: '',
  };

  const askResponseGpt = await makeApiRequestGpt(state, turn);

  turn.bot = askResponseGpt.answer;
  addMessageToConversationHistory(state, turn);

  setConversationId(state, askResponseGpt.conversation_id);

  const citationFileReferences = getCitations(askResponseGpt.answer);
  const markdown_answer = convertHtmlToMarkdown(askResponseGpt.answer);
  const answer = replaceCitations(citationFileReferences, markdown_answer);
  const citations = convertCitations(citationFileReferences);
  const followup_questions = null;
  const supportingContent = null;

  // const chatResponse = await getChatResponse(state.conversation.messages);
  // const chatContext = chatResponse.choices[0].context;
  // const {followup_questions} = chatContext;
  // const {text: data_points} = chatContext.data_points;
  // const {message: reply} = chatResponse.choices[0];

  // const citationFileReferences = getCitations(reply.content);
  // const answer = replaceCitations(citationFileReferences, reply.content);
  // const citations = convertCitations(citationFileReferences);
  // const supportingContent = getSupportingContent(data_points);

  const data: ResponseCard = {
    answer,
    citations,
    supportingContent,
  };
  const card = createResponseCard(data);

  await sendAdaptiveCard(context, card, followup_questions);
};

export {setup};
