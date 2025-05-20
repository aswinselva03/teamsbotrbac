import {
  CloudAdapter,
  ConfigurationBotFrameworkAuthentication,
  ConfigurationServiceClientCredentialFactory,
  TurnContext,
  TeamsSSOTokenExchangeMiddleware,
} from 'botbuilder';
import {BlobsStorage} from 'botbuilder-azure-blobs';
import config from './config';

// create bot framework authentication configuration
const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication(
  {},
  new ConfigurationServiceClientCredentialFactory({
    MicrosoftAppId: config.botId,
    MicrosoftAppPassword: config.botPassword,
    MicrosoftAppType: 'MultiTenant',
  })
);
const storage = new BlobsStorage(
  config.blobConnectionString,
  config.blobContainerName
);
// create bot adapter
const connectionName = 'teamsbotsso';
const adapter = new CloudAdapter(botFrameworkAuthentication);
adapter.use(new TeamsSSOTokenExchangeMiddleware(storage, connectionName));
// set catch-all error handler
adapter.onTurnError = async (context: TurnContext, error: Error) => {
  // This check writes out errors to console log .vs. app insights.
  // NOTE: In production environment, you should consider logging this to Azure
  //       application insights.
  console.error(`\n [onTurnError] unhandled error: ${error}`);

  // Send a trace activity, which will be displayed in Bot Framework Emulator
  await context.sendTraceActivity(
    'OnTurnError Trace',
    `${error}`,
    'https://www.botframework.com/schemas/error',
    'TurnError'
  );

  // Send a message to the user
  await context.sendActivity(
    `The bot encountered unhandled error:\n ${error.message}`
  );
  await context.sendActivity(
    'To continue to run this bot, please fix the bot source code.'
  );
};

export default adapter;
