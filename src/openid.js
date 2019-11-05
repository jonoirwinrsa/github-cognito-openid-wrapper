const logger = require('./connectors/logger');
const crypto = require('./crypto');
const slack = require('./slack');

const getJwks = () => ({ keys: [crypto.getPublicKey()] });

const getUserInfo = accessToken =>
  slack()
    .getUserDetails(accessToken)
    .then(userDetails => {
      logger.debug('Fetched user details: %j', userDetails, {});
      // Here we map the slack user response to the standard claims from
      // OpenID. The mapping was constructed by following
      // https://developer.slack.com/v3/users/
      // and http://openid.net/specs/openid-connect-core-1_0.html#StandardClaims
      const claims = {
        sub: `${userDetails.user.id}`, // OpenID requires a string
        name: userDetails.user.real_name,
        preferred_username: userDetails.user.name,
        email: userDetails.user.profile.email,
        phone: userDetails.user.profile.phone,
        picture: userDetails.user.profile.image_512,
        updated_at: userDetails.user.updated
      };
      logger.debug('Resolved claims: %j', claims, {});
      return claims;
    });

const getAuthorizeUrl = (client_id, scope, state, response_type) =>
  slack().getAuthorizeUrl(client_id, scope, state, response_type);

const getTokens = (code, state, host) =>
  slack()
    .getToken(code, state)
    .then(slackToken => {
      logger.debug('Got token: %s', JSON.stringify(slackToken), {});
      // Slack returns scopes separated by commas
      // But OAuth wants them to be spaces
      // https://tools.ietf.org/html/rfc6749#section-5.1
      // Also, we need to add openid as a scope,
      // since Slack will have stripped it
      const scope = `openid ${slackToken.scope.replace(',', ' ')}`;

      // ** JWT ID Token required fields **
      // iss - issuer https url
      // aud - audience that this token is valid for (SLACK_CLIENT_ID)
      // sub - subject identifier - must be unique
      // ** Also required, but provided by jsonwebtoken **
      // exp - expiry time for the id token (seconds since epoch in UTC)
      // iat - time that the JWT was issued (seconds since epoch in UTC)

      return new Promise(resolve => {
        const payload = {
          // This was commented because Cognito times out in under a second
          // and generating the userInfo takes too long.
          // It means the ID token is empty except for metadata.
          //  ...userInfo,
          sub: slackToken.user_id,
          email: `${slackToken.user_id}@example.com`
        };

        const idToken = crypto.makeIdToken(payload, host);
        const tokenResponse = {
          ...slackToken,
          scope,
          token_type: 'bearer',
          id_token: idToken
        };

        logger.debug('Resolved token response: %j', tokenResponse, {});

        resolve(tokenResponse);
      });
    });

const getConfigFor = host => ({
  issuer: `https://${host}`,
  authorization_endpoint: `https://${host}/authorize`,
  token_endpoint: `https://${host}/token`,
  token_endpoint_auth_methods_supported: [
    'client_secret_basic',
    'private_key_jwt'
  ],
  token_endpoint_auth_signing_alg_values_supported: ['RS256'],
  userinfo_endpoint: `https://${host}/userinfo`,
  // check_session_iframe: 'https://server.example.com/connect/check_session',
  // end_session_endpoint: 'https://server.example.com/connect/end_session',
  jwks_uri: `https://${host}/.well-known/jwks.json`,
  // registration_endpoint: 'https://server.example.com/connect/register',
  scopes_supported: ['users:read', 'users:read.email'],
  response_types_supported: [
    'code',
    'code id_token',
    'id_token',
    'token id_token'
  ],

  subject_types_supported: ['public'],
  userinfo_signing_alg_values_supported: ['none'],
  id_token_signing_alg_values_supported: ['RS256'],
  request_object_signing_alg_values_supported: ['none'],
  display_values_supported: ['page', 'popup'],
  claims_supported: [
    'sub',
    'name',
    'preferred_username',
    'profile',
    'picture',
    'website',
    'email',
    'email_verified',
    'updated_at',
    'iss',
    'aud'
  ]
});

module.exports = {
  getTokens,
  getUserInfo,
  getJwks,
  getConfigFor,
  getAuthorizeUrl
};
