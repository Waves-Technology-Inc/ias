import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Shopify } from "../controllers/controller";
import { CachedResponse, calculateExpirationTime, isExpired } from '../../common/cache';

export const cache: { [orderId: string]: CachedResponse } = {};

export const getOrderByOrderId = async (event:APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    try {
        const data = event.body;
        const {orderId, advertiserId } = JSON.parse(data!);
        
        if (!orderId || !advertiserId) return {
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

        if (cache[orderId] && !isExpired(cache[orderId].ttl)) {
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    success: true,
                    code: 'SUCCESS',
                    order: {
                        ...cache[orderId].data,
                        cached:true
                    },
                }),
            };
        }

        const order = await new Shopify().getOrder(orderId, advertiserId);

        const ttlInSeconds = 600;
        cache[orderId] = {
            data:order,
            ttl:calculateExpirationTime(ttlInSeconds)
        };

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                code: 'SUCCESS',
                order: {
                    ...order,
                    cached: false
                },
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
            })
        };
    };
};