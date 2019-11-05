#!/bin/bash -eu

# Variables always required
export SLACK_CLIENT_ID=# <Slack OAuth App Client ID>
export SLACK_CLIENT_SECRET=# <Slack OAuth App Client Secret>
export COGNITO_REDIRECT_URI=# https://<Your Cognito Domain>/oauth2/idpresponse

# Variables required if used with Slack Enterprise
# SLACK_API_URL=# https://<Slack Enterprise Host>/api/v3
# SLACK_LOGIN_URL=# https://<Slack Enterprise Host>

# Variables required if Splunk logger is used
# SPLUNK_URL=# https://<Splunk HEC>/services/collector/event/1.0
# SPLUNK_TOKEN=# Splunk HTTP Event Collector token
# SPLUNK_SOURCE=# Source for all logged events
# SPLUNK_SOURCETYPE=# Sourcetype for all logged events
# SPLUNK_INDEX=# Index for all logged events

# Variables required if deploying with API Gateway / Lambda
export BUCKET_NAME=# An S3 bucket name to use as the deployment pipeline
export STACK_NAME=# The name of the stack to create
export REGION=# AWS region to deploy the stack and bucket in

# Variables required if deploying a node http server
export PORT=# <Port to start the server on>
