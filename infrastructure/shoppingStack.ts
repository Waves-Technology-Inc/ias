import * as cdk from 'aws-cdk-lib';
import { RestApi, Cors } from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { AccountsConstruct } from '../services/accounts/accountConstruct';
import { ShopifyConstruct } from '../services/shopify/shopifyConstruct';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

dotenv.config({
    path: path.resolve(__dirname, '../.env'),
});

export interface ShoppingServiceStackProps extends cdk.StackProps {
    environment: string;
};

export class ShoppingServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: ShoppingServiceStackProps) {
        super(scope, id, props);

        const { environment } = props;

        const apiGateway: RestApi = new RestApi(this, `ShoppingService-${environment}`, {
            defaultCorsPreflightOptions: {
                allowOrigins: Cors.ALL_ORIGINS, // might need to change this
                allowMethods: Cors.ALL_METHODS,
                allowHeaders: ['*'],
                allowCredentials: true,
            },
            deployOptions: {
                stageName: environment.toLowerCase(),
            }
        });

        let DATABASE_URI = '';

        if (environment === 'PROD') {
            DATABASE_URI = process.env.PROD_DATABASE_URI ?? '';
        } else if (environment === 'DEV') {
            DATABASE_URI = process.env.DEV_DATABASE_URI ?? '';
        };
    };
};