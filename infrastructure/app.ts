#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { ShoppingServiceStack } from './shoppingStack';

dotenv.config({
    path: path.resolve(__dirname, '../.env'),
});

const ENVIRONMENT = process.env.ENVIRONMENT ?? 'DEV';

console.log('\nDeploying to environment:', ENVIRONMENT, '\n');

const app = new cdk.App();
new ShoppingServiceStack(app, `ShoppingStack-${ENVIRONMENT}`, { environment: ENVIRONMENT });