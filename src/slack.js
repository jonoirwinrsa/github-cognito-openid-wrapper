const axios = require('axios');
const {
  SLACK_CLIENT_ID,
  SLACK_CLIENT_SECRET,
  COGNITO_REDIRECT_URI
} = require('./config');
const logger = require('./connectors/logger');

const getApiEndpoints = () => ({
  userDetails: `https://slack.com/api/users.identity`,
  oauthToken: `https://slack.com/api/oauth.access`,
  oauthAuthorize: `https://slack.com/oauth/authorize`
});

const check = response => {
  logger.debug('Checking response: %j', response, {});
  if (response.data) {
    if (response.data.error) {
      throw new Error(
        `Slack API responded with a failure: ${response.data.error}, ${
          response.data.error_description
        }`
      );
    } else if (response.status === 200) {
      return response.data;
    }
  }
  throw new Error(
    `Slack API responded with a failure: ${response.status} (${
      response.statusText
    })`
  );
};

const slackGet = (url, accessToken, params) =>
  axios({
    method: 'get',
    url,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params,
  });

module.exports = (apiBaseUrl, loginBaseUrl) => {
  const urls = getApiEndpoints(apiBaseUrl, loginBaseUrl || apiBaseUrl);
  return {
    getAuthorizeUrl: (client_id, scope, state, response_type) => {
      scope.split('openid').join('');
      return `${
        urls.oauthAuthorize
      }?client_id=${client_id}&scope=${encodeURIComponent(
        scope
      )}&state=${state}&response_type=${response_type}`;
    },
    getUserDetails: accessToken =>
      slackGet(urls.userDetails, accessToken).then(check),
    getToken: (code, state) => {
      const data = {
        // OAuth required fields
        grant_type: 'authorization_code',
        redirect_uri: COGNITO_REDIRECT_URI,
        client_id: SLACK_CLIENT_ID,
        // Slack Specific
        response_type: 'code',
        client_secret: SLACK_CLIENT_SECRET,
        code,
        // State may not be present, so we conditionally include it
        ...(state && { state })
      };

      logger.debug(
        'Getting token from %s with data: %j',
        urls.oauthToken,
        data,
        {}
      );
      return axios({
        method: 'get',
        url: urls.oauthToken,
        params: data,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      }).then(check);
    }
  };
};
