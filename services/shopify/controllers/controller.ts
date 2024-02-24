import axios from 'axios';
import { Order } from '../schemas/order';
import { completeDraftOrder, draftOrderCreate, getDraftOrder } from '../schemas/queries';
import * as mongo from 'mongodb';
import mongoose, { Types } from 'mongoose';
import Account, { Purchase, ShopifyStripePayment } from '../../accounts/schemas/account';
const mongoclient = new mongo.MongoClient('mongodb+srv://justin:BuQAsNHbnRvxVtv3@waves.nri60mg.mongodb.net/test?retryWrites=true&w=majority');

export class Shopify {
    async getAdvertiserShopifyCredentials (advertiserId:string) {
        await mongoclient.connect();
        
        const db = mongoclient.db('test');
        const coll = db.collection('advertisers');

        const shopifyCredentials = await coll.findOne({'_id': new mongo.ObjectId(advertiserId)}, {projection: {'advertiserExternals.shopify':1, _id:0}});
        return shopifyCredentials?.advertiserExternals?.shopify ?? null;
    };

    async clearAccountCart (accountId:string) {
        await mongoose.connect('mongodb+srv://justin:BuQAsNHbnRvxVtv3@waves.nri60mg.mongodb.net/test?retryWrites=true&w=majority');

        const account = await Account.findById(accountId);
        account?.clearCart();
        await account?.save();

        await mongoose.disconnect();
        return account;
    };

    async storePurchase (purchase:Purchase, accountId:string) {
        await mongoose.connect('mongodb+srv://justin:BuQAsNHbnRvxVtv3@waves.nri60mg.mongodb.net/test?retryWrites=true&w=majority');
        const account = await Account.findById(accountId);
        account?.addItemToPurchases(purchase);
        await account?.save();
        await mongoose.disconnect();
        return account;
    };

    async processAndCompleteOrder (order:Order, advertiserId:string, accountId:string, offerId:string, requiredPayment:boolean, orderHash:string, paymentObject?:ShopifyStripePayment | null) {
        try {
            await mongoose.connect('mongodb+srv://justin:BuQAsNHbnRvxVtv3@waves.nri60mg.mongodb.net/test?retryWrites=true&w=majority')
            const account = await Account.findById(accountId);
            if (!account) throw new Error(`INVALID_ACCOUNT_ID`);

            await mongoose.disconnect();

            if (account?.accountAcceptedOffers.find(offer => offer?.offer_id?.toString() === offerId)) {
                throw new Error(`PRODUCTS_ALREADY_CLAIMED`);
            }
            // place shopify order;
            const draftOrderResponse:any = await this.draftOrder(
                order,
                advertiserId,
                accountId,
                offerId,
            ).catch((error) => {
                throw new Error(error);
            });

            if (!draftOrderResponse) throw new Error(`ERROR_DRAFT_ORDER`);
            const { draftOrderId, orderData, confirmedOrderId }:any = draftOrderResponse;
            
            const formattedLineItems = [];
            for (const item of orderData?.lineItems?.nodes) {
                const variantIdOfItem = item?.variant?.id;
                const itemInOrder = order?.lineItems?.filter((doc) => doc?.variantId === variantIdOfItem);
                formattedLineItems.push({
                    ...item,
                    pricePaid: itemInOrder?.[0]?.pricePaid
                });
            };
            
            await this.storePurchase({
                items: formattedLineItems,
                orderHash,
                orderId: confirmedOrderId,
                discountRate: null,
                customerEmail: orderData?.email,
                shippingAddress: orderData?.shippingAddress,
                requiredPayment: requiredPayment,
                transaction: paymentObject ?? null,
                offerId: new mongoose.Types.ObjectId(offerId),
                advertiserId: new mongoose.Types.ObjectId(advertiserId),
                createdAt: new Date().getTime()
            }, accountId);
    
            return { confirmedOrderId, advertiser_id:advertiserId };
        } catch (error) {
            return error;
        };
    };

    async draftOrder (order: Order, advertiserId:string, accountId:string, offerId:string) {
        try {
            const draftOrderData = draftOrderCreate(order);
            const shopifyCredentials = await this.getAdvertiserShopifyCredentials(advertiserId);
            const response = await axios(`https://${shopifyCredentials?.shopify_store}.myshopify.com/admin/api/2023-07/graphql.json`, {
                method:"POST",
                data: draftOrderData,
                headers: {
                    'X-Shopify-Access-Token': shopifyCredentials?.shopify_access_token,
                    'Content-Type': 'application/json'
                }
            });

            if (response?.status !== 200) throw new Error(`Failed FETCH to Store: DraftOrder`);
            const responseData = response.data;

            if (responseData?.data?.draftOrderCreate?.draftOrder?.id) {
                const orderId = responseData?.data?.draftOrderCreate?.draftOrder?.id ?? null;
                if (!orderId) return null;

                const orderConfirmation = await this.confirmDraftOrder(orderId, advertiserId);
                await this.clearAccountCart(accountId);
                return {draftOrderId: responseData?.data?.draftOrderCreate?.draftOrder?.id, orderData: orderConfirmation, confirmedOrderId: orderConfirmation?.id};
            };

            return null;
        } catch (error:any) {
            throw new Error(`${error.message}`);
        };
    };

    async confirmDraftOrder (orderId:string, advertiserId:string) {
        try {
            const completeOrderData = completeDraftOrder(orderId);
            const shopifyCredentials = await this.getAdvertiserShopifyCredentials(advertiserId);

            const response = await axios(`https://${shopifyCredentials?.shopify_store}.myshopify.com/admin/api/2023-07/graphql.json`, {
                method:"POST",
                data: completeOrderData,
                headers: {
                    'X-Shopify-Access-Token': shopifyCredentials?.shopify_access_token,
                    'Content-Type': 'application/json'
                }
            }).catch((error) => {
                throw new Error('Failed FETCH to Store: DraftOrder')
            });
            
            if (response?.status !== 200) throw new Error(`Failed FETCH to Store: DraftOrder`);
            const responseData = response.data.data;
            if (responseData?.draftOrderComplete?.draftOrder) {
                return responseData?.draftOrderComplete?.draftOrder
            };

            return null;
        } catch (error) {
            return error;
        };      
    };

    async getCollectionProducts (advertiserId: string, collectionId: string) {
        try {
            const response = await axios(`https://2iijwteyx3.execute-api.us-east-1.amazonaws.com/prod/shopify/collection/${advertiserId}/${collectionId}`, {
                method:"GET",
                headers: {
                    'Content-Type':'application/json'
                }
            });

            const data = response?.data;
            if (!data?.success) throw new Error(`ERROR_FETCHING_PRODUCTS`);
            
            const products = data?.products?.products?.edges;
            return products;
        } catch (error) {
           return error;
        };
    };

    async getOrder (orderId:string, advertiserId:string) {
        try {
            const shopifyCredentials = await this.getAdvertiserShopifyCredentials(advertiserId);
            const getOrderData = getDraftOrder(orderId);

            const response = await axios(`https://${shopifyCredentials?.shopify_store}.myshopify.com/admin/api/2023-07/graphql.json`, {
                method:"POST",
                data: getOrderData,
                headers: {
                    'X-Shopify-Access-Token': shopifyCredentials?.shopify_access_token,
                    'Content-Type': 'application/json'
                }
            }).catch((error) => {
                throw new Error('Failed FETCH to Store: DraftOrder')
            });

            if (response?.status !== 200) throw new Error(`Failed FETCH to Store: DraftOrder`);
            const responseData = response.data?.data;

            //if (responseData?.errors?.length > 0) throw new Error(`Failed DUE TO: ${responseData?.errors}`);

            if (responseData && responseData?.draftOrder) {
                const shopifyOrderData = responseData?.draftOrder;
                const orderData = shopifyOrderData.order;

                return orderData;
            };

            return null;
        } catch (error) {
            return error;
        };
    };
};


// new Shopify().clearAccountCart("6566542affab0aa5cea5350e");
// new Shopify().getOrder("gid://shopify/DraftOrder/992834093215", "64ada24b71eff935d51a087f");

/*
new Shopify().draftOrder({
    billingAddress: {
        address1: "91 Red River St",
        address2: "1213",
        city: "Austin",
        country: "US",
        countryCode: "US",
        firstName: "Roger",
        lastName: "Nowakowski",
        phone: "9543552600",
        province: "Texas",
        provinceCode: "TX",
        zip: "78701"
    },
    email: "rog.nowak@gmail.com",
    lineItems: [{
        grams:57,
        originalUnitPrice:'29.99',
        quantity:1, 
        requiresShipping:true,
        taxable:true,
        variantId: "gid://shopify/ProductVariant/47263107350832"
    }],
    phone: "9543552600",
    presentmentCurrencyCode: "USD"
}, '6500fddfd7958c4491cf7f5a', "6578d996ab1358733cf901a2", "64ef61eed83f55a4e18b0501");
*/
