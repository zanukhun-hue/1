const serverless = require('serverless-http');
const { app } = require('../../server-original');

const handle = serverless(app, { basePath: '/.netlify/functions/catalog' });

exports.handler = (event, context) => {
  const headers = { ...event.headers };
  const clientIp = headers['x-nf-client-connection-ip'];
  if (!clientIp) return handle(event, context);

  delete headers['x-forwarded-for'];
  const requestContext = {
    ...event.requestContext,
    identity: { ...event.requestContext?.identity, sourceIp: clientIp }
  };
  return handle({ ...event, headers, requestContext }, context);
};
