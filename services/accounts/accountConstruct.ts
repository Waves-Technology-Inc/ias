import { Construct } from 'constructs';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import path from 'path';
import { Duration } from 'aws-cdk-lib';

export interface AccountsStackProps {
    apiGateway: RestApi;
    databaseUri: string;
};

export class AccountsConstruct extends Construct {
    constructor (scope: Construct, id: string, props: AccountsStackProps) {
        super(scope, id);

        const { apiGateway } = props;

        const environment = {
            DATABASE_URI: props.databaseUri,
        };

        const PollOrderInQueue = new NodejsFunction(this, 'PollOrderInQueue', {
            runtime: Runtime.NODEJS_18_X,
            handler: 'PollOrderInQueue',
            entry: path.join(__dirname, `lambda/index.ts`),
            environment: environment,
            timeout:Duration.seconds(10)
        });

        const getRecommendedProducts = new NodejsFunction(this, 'getRecommendedProducts', {
            runtime: Runtime.NODEJS_18_X,
            handler: 'getRecommendedProducts',
            entry: path.join(__dirname, `lambda/index.ts`),
            environment: environment,
            timeout:Duration.seconds(10)
        });

        const addProductToCart = new NodejsFunction(this, 'addProductToCart', {
            runtime: Runtime.NODEJS_18_X,
            handler: 'addProductToCart',
            entry: path.join(__dirname, `lambda/index.ts`),
            environment: environment,
            timeout:Duration.seconds(10)
        });

        const getAccountCart = new NodejsFunction(this, 'getAccountCart', {
            runtime: Runtime.NODEJS_18_X,
            handler: 'getAccountCart',
            entry: path.join(__dirname, `lambda/index.ts`),
            environment: environment,
            timeout:Duration.seconds(10)
        });

        const deleteProductFromCart = new NodejsFunction(this, 'deleteProductFromCart', {
            runtime: Runtime.NODEJS_18_X,
            handler: 'deleteProductFromCart',
            entry: path.join(__dirname, `lambda/index.ts`),
            environment: environment,
            timeout:Duration.seconds(10)
        });

        const addAddress = new NodejsFunction(this, 'addAddress', {
            runtime: Runtime.NODEJS_18_X,
            handler: 'addAddress',
            entry: path.join(__dirname, `lambda/index.ts`),
            environment: environment,
            timeout:Duration.seconds(10)
        });

        const getAllAddresses = new NodejsFunction(this, 'getAllAddresses', {
            runtime: Runtime.NODEJS_18_X,
            handler: 'getAllAddresses',
            entry: path.join(__dirname, `lambda/index.ts`),
            environment: environment,
            timeout:Duration.seconds(10)
        });

        const getAllPurchases = new NodejsFunction(this, 'getAllPurchases', {
            runtime: Runtime.NODEJS_18_X,
            handler: 'getAllPurchases',
            entry: path.join(__dirname, `lambda/index.ts`),
            environment: environment,
            timeout:Duration.seconds(10)
        });

        const deleteAddress = new NodejsFunction(this, 'deleteAddress', {
            runtime: Runtime.NODEJS_18_X,
            handler: 'deleteAddress',
            entry: path.join(__dirname, `lambda/index.ts`),
            environment: environment,
            timeout:Duration.seconds(10)
        });

        const processAndCompleteOrder = new NodejsFunction(this, 'processAndCompleteOrder', {
            runtime: Runtime.NODEJS_18_X,
            handler: 'processAndCompleteOrder',
            entry: path.join(__dirname, `lambda/index.ts`),
            environment: environment,
            timeout:Duration.seconds(30)
        });

        const getPurchase = new NodejsFunction(this, 'getPurchase', {
            runtime: Runtime.NODEJS_18_X,
            handler: 'getPurchase',
            entry: path.join(__dirname, `lambda/index.ts`),
            environment: environment,
            timeout:Duration.seconds(15)
        });

        const getAccountShopping = new NodejsFunction(this, 'getAccountShopping', {
            runtime: Runtime.NODEJS_18_X,
            handler: 'getAccountShopping',
            entry: path.join(__dirname, `lambda/index.ts`),
            environment: environment,
            timeout:Duration.seconds(15)
        });

        const refundForCharge = new NodejsFunction(this, 'refundForCharge', {
            runtime: Runtime.NODEJS_18_X,
            handler: 'refundForCharge',
            entry: path.join(__dirname, `lambda/index.ts`),
            environment: environment,
            timeout:Duration.seconds(15)
        });


        /// ORDER QUEUE HANDLERS ///

        const OrderQueueTrigger = new NodejsFunction(this, 'OrderQueueTrigger', {
            functionName:"OrderQueueTrigger",
            runtime: Runtime.NODEJS_18_X,
            handler: 'OrderQueueTrigger',
            entry: path.join(__dirname, `lambda/index.ts`),
            environment: environment,
            timeout:Duration.minutes(1)
        });

        const InvokeOrderQueue = new NodejsFunction(this, 'InvokeOrderQueue', {
            runtime: Runtime.NODEJS_18_X,
            handler: 'InvokeOrderQueue',
            entry: path.join(__dirname, `lambda/index.ts`),
            environment: {...environment, ORDER_QUEUE_TRIGGER_FUNCTION_NAME:OrderQueueTrigger.functionName},
            timeout:Duration.seconds(15)
        });


        OrderQueueTrigger.grantInvoke(InvokeOrderQueue);

        /// END ORDER QUEUE HANDLERS ///

        const accountRoute = apiGateway.root.addResource('account');
        const accountProductRoute = accountRoute.addResource('shopping');
        const accountProductRouteWithId = accountProductRoute.addResource("{accountId}");
        const accountAddressesRoute = accountProductRoute.addResource('addresses');
        const accountPurchasesRoute = accountProductRoute.addResource('purchases');

        const addToCartIntegration = new LambdaIntegration(addProductToCart);
        const getAccountCartIntegration = new LambdaIntegration(getAccountCart);
        const deleteProductFromCartIntegration = new LambdaIntegration(deleteProductFromCart);
        const getAllAddressesIntegration = new LambdaIntegration(getAllAddresses);
        const addAddressIntegration = new LambdaIntegration(addAddress);
        const getAllPurchasesIntegration = new LambdaIntegration(getAllPurchases);
        const deleteAddressIntegration = new LambdaIntegration(deleteAddress);


        // accountRoute.addResource("recommendations").addMethod("GET", new LambdaIntegration(getRecommendedProducts));

        // accountProductRouteWithId.addMethod("GET", new LambdaIntegration(getAccountShopping));
        // accountPurchasesRoute.addResource('refund').addMethod("POST", new LambdaIntegration(refundForCharge));
        // accountProductRoute.addResource("add").addMethod("POST", addToCartIntegration);
        // accountProductRoute.addResource("order").addMethod("POST", new LambdaIntegration(InvokeOrderQueue));
        // accountProductRoute.addResource("poll").addResource("{incomingOrderHash}").addMethod("GET", new LambdaIntegration(PollOrderInQueue))
        // accountProductRouteWithId.addResource("{uuid}").addResource("remove").addMethod("DELETE", deleteProductFromCartIntegration);
        // accountProductRouteWithId.addResource("cart").addMethod("GET", getAccountCartIntegration);

        // accountAddressesRoute.addResource("{accountId}").addResource("all").addMethod("GET", getAllAddressesIntegration);
        // accountAddressesRoute.addMethod("POST", addAddressIntegration);
        // accountAddressesRoute.addMethod("DELETE", deleteAddressIntegration);
        
        // accountPurchasesRoute.addResource("{accountId}").addMethod("GET", getAllPurchasesIntegration);
        // accountPurchasesRoute.addResource('find').addMethod("POST", new LambdaIntegration(getPurchase));
    };
};