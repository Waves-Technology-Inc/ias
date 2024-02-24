import { Construct } from 'constructs';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import path from 'path';
import { Duration } from 'aws-cdk-lib';
import { AccountsStackProps } from '../accounts/accountConstruct';

export interface ShopifyStackProps {
    apiGateway: RestApi;
    databaseUri: string;
};

export class ShopifyConstruct extends Construct {
    constructor (scope: Construct, id:string, props: AccountsStackProps) {
        super (scope, id);

        const { apiGateway } = props;

        const environment = {
            DATABASE_URI: props.databaseUri,
        };

        const getOrderByOrderId = new NodejsFunction(this, 'getOrderByOrderId', {
            runtime: Runtime.NODEJS_18_X,
            handler: 'getOrderByOrderId',
            entry: path.join(__dirname, `lambda/index.ts`),
            environment: environment,
            timeout:Duration.seconds(10)
        });

        const shopifyRoute = apiGateway.root.addResource('shopify');
        const ordersRoute = shopifyRoute.addResource('orders');

        const getOrdersIntegration = new LambdaIntegration(getOrderByOrderId);

        ordersRoute.addResource('get').addMethod("POST", getOrdersIntegration);
    };
};