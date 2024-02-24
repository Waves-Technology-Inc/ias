import { APIGatewayEvent } from "aws-lambda";
import { Accounts, generateRandomId } from "../controllers/controller";
import { Address, IAccount } from "../schemas/account";
import { Shopify } from "../../shopify/controllers/controller";
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { Order } from "../schemas/order";

const REGION = 'us-east-1';
const lambdaClient = new LambdaClient({ region: REGION });
const ORDER_QUEUE_TRIGGER_FUNCTION_NAME = process.env.ORDER_QUEUE_TRIGGER_FUNCTION_NAME || "OrderQueueTrigger"

export const OrderQueueTrigger = async(event:{
    incomingOrder: Partial<Order[]>,
    accountId: string;
    incomingOrderHash: string;
}) => {
    try {
        await new Accounts().processOrder(event.incomingOrder, event.accountId, event.incomingOrderHash);
    } catch (error) {
        console.log(error);
    };
};

export const PollOrderInQueue = async (event: APIGatewayEvent) => {
    try {
        const incomingOrderHash = event?.pathParameters?.incomingOrderHash ?? null;
    
        const order = await new Accounts().pollOrder(incomingOrderHash!);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                code: 'SUCCESS',
                order
            }),
        };
    } catch (error:any) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                code: `ERROR: ${error}`,
            }),
        };
    };
};

export const InvokeOrderQueue = async (event: APIGatewayEvent) => {
    const body = event?.body;
    const {incomingOrder, accountId} = JSON.parse(body!);
    const incomingOrderHash = generateRandomId();

    const invokeCommand = new InvokeCommand({
        FunctionName: ORDER_QUEUE_TRIGGER_FUNCTION_NAME,
        InvocationType: "Event",
        Payload: Buffer.from(
            JSON.stringify({
                incomingOrder,
                accountId,
                incomingOrderHash
            })
        )
    });

    await lambdaClient.send(invokeCommand);

    return {
        statusCode:200,
        body: JSON.stringify({
            incomingOrderHash
        })
    };
};

export const getRecommendedProducts = async (event: APIGatewayEvent) => {
    try {
        const products = await new Accounts().getRecommendedProducts();
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                code: 'SUCCESS',
                products
            }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                code: `ERROR: ${error}`,
            }),
        };
    };
};

export const getPurchase = async (event: APIGatewayEvent) => {
    try {
        const data = event?.body;
        const { orderId, accountId } = JSON.parse(data!);

        if (!accountId || !orderId) return {
            statusCode: 404,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                code: 'MISSING PATH PARAMS',
            }),
        };

        const purchase = await new Accounts().getPurchase(accountId, orderId);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                code: 'SUCCESS',
                purchase
            }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                code: `ERROR: ${error}`,
            }),
        };
    };
};

export const processAndCompleteOrder = async (event: APIGatewayEvent) => {
    try {
        const data = event?.body;
        const { order, advertiserId, accountId, offerId, requiredPayment, paymentObject } = JSON.parse(data!);

        const { confirmedOrderId, advertiser_id }: any = await new Shopify().processAndCompleteOrder(order, advertiserId, accountId, offerId, requiredPayment, paymentObject ?? null);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                code: 'SUCCESS',
                confirmedOrderId: confirmedOrderId || null,
                advertiserId: advertiser_id || null
            }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                code: `ERROR: ${error}`,
            }),
        };
    }
};

export const addProductToCart = async (event: APIGatewayEvent) => {
    try {
        const { accountId, item } = JSON.parse(event.body!);

        if (!accountId || !item) return {
            statusCode: 404,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                code: 'ERROR',
            }),
        };

        const account = await new Accounts().addProductToCart(item, accountId);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                code: 'SUCCESS',
                account,
            }),
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                code: `${error?.message}`
            }),
        };
    };
};

export const deleteProductFromCart = async (event: APIGatewayEvent) => {
    try {
        const accountId = event.pathParameters?.accountId;
        const uuid = event.pathParameters?.uuid;

        const cart = await new Accounts().deleteProductFromCart(uuid!, accountId!);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                code: 'SUCCESS',
                cart,
            }),
        }
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                code: 'SERVER_ERROR',
                error,
            }),
        };
    };
};

export const getAccountShopping = async (event: APIGatewayEvent) => {
    try {
        const accountId = event?.pathParameters?.accountId;

        const shopping = await new Accounts().getAccountShopping(accountId!);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                code: 'SUCCESS',
                shopping,
            }),
        }
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                code: `ERROR:${error}`,
            }),
        };
    };
}

export const getAccountCart = async (event: APIGatewayEvent) => {
    try {
        const accountId = event.pathParameters?.accountId;
        const cart = await new Accounts().getAccountCart(accountId!);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                code: 'SUCCESS',
                cart,
            }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                code: 'SERVER_ERROR',
                error,
            }),
        };
    };
};

export const getAllAddresses = async (event: APIGatewayEvent) => {
    try {
        const accountId = event?.pathParameters?.accountId;
        const addresses = await new Accounts().getAllAddresses(accountId!);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                code: 'SUCCESS',
                addresses,
            }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                code: 'SERVER_ERROR',
                error,
            }),
        };
    };
};

export const deleteAddress = async (event: APIGatewayEvent) => {
    try {
        const data = event?.body;
        const { accountId, addressId } = JSON.parse(data!);
        const account: any = await new Accounts().deleteAddress(addressId, accountId);

        if (!account) return {
            statusCode: 404,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                code: 'ERROR: NO_ACCOUNT_FOUND',
            }),
        };

        const addresses = account?.accountShopping?.addresses;
        const filteredAddresses = addresses.filter((address: Address) => address.addressId !== addressId);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                code: 'SUCCESS',
                addresses: filteredAddresses,
            }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                code: `ERROR: ${error}`,
            }),
        };
    }
}

export const addAddress = async (event: APIGatewayEvent) => {
    try {
        const data = event?.body;

        if (!data) return {
            statusCode: 404,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                code: 'ERROR',
            }),
        };

        const { address, accountId } = JSON.parse(data);
        const addresses = await new Accounts().addAddress(address, accountId);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                code: 'SUCCESS',
                addresses,
            }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                code: 'SERVER_ERROR',
                error,
            }),
        };
    };
};

export const refundForCharge = async (event: APIGatewayEvent) => {
    try {
        const data = event?.body;
        const { accountId, chargeId } = JSON.parse(data!);
        const refunded = await new Accounts().createRefundForCharge(chargeId, accountId);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                code: 'SUCCESS',
                refunded,
            }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                code: `ERROR: ${error}`
            }),
        };
    };
};

export const getAllPurchases = async (event: APIGatewayEvent) => {
    try {
        const accountId = event?.pathParameters?.accountId;

        const purchases = await new Accounts().getAllPurchases(accountId!);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                code: 'SUCCESS',
                purchases,
            }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                code: 'SERVER_ERROR',
                error,
            }),
        };
    };
};