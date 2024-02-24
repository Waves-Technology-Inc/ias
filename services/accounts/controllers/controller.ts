import mongoose from "mongoose";
import Account, { Address } from "../schemas/account";
import { CartItem } from "../schemas/product";
import { Stripe } from "../../common/stripe";
import Mongo, { createNewOrderForQueue } from "../../common/mongo";
import { Order, ProcessingStatus } from "../schemas/order";
import { Shopify } from "../../shopify/controllers/controller";

const databaseUri = "mongodb+srv://roger:ue8E3N7bKrcF7j5v@waves.nri60mg.mongodb.net/test?retryWrites=true&w=majority"
const mongo = new Mongo();

export const generateRandomId = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < 20; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

const getRandomSample = (array: any[], sampleSize: number) => {
    const sampleArray = array.slice();
    for (let i = sampleArray.length - 1; i>0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sampleArray[i], sampleArray[j]] = [sampleArray[j], sampleArray[i]];
    };

    return sampleArray.slice(0, sampleSize);
}

export class Accounts {

    async pollOrder(incomingOrderHash: string) {
        try {
            return await mongo.getOrderInQueue(incomingOrderHash);
        } catch (error: any) {
            return (`${error.message}`);
        };
    };

    async taskTrigger(tasks: any[], fn: any, threads: number, incomingOrderHash?: string) {
        console.log({ tasks, threads });
        const result = [];
        while (tasks.length) {
            if (incomingOrderHash) {
                const taskRes = await Promise.all(tasks.splice(0, threads).map(task => this.taskRunner(task, incomingOrderHash, fn)));
                result.push(taskRes);
            } else {
                const taskRes = await Promise.all(tasks.splice(0, threads).map(task => fn(task)));
                result.push(taskRes);
            };
        };

        return result.flat();
    };

    async taskRunner(task: any, incomingOrderHash: string, fn: any) {
        try {
            return await fn({ task, incomingOrderHash });
        } catch (error) {
            return null;
        };
    };

    async processOrder(incomingOrder: Partial<Order[]>, accountId: string, incomingOrderHash: string) {
        try {
            for (const order of incomingOrder) {
                if (!order) return;
                order.accountId = accountId;
                order.orderHash = generateRandomId();
                order.incomingOrderHash = incomingOrderHash;
                await mongo.createNewOrderForQueue(order);
            };

            for (const order of incomingOrder) {
                if (!order) return;
                try {
                    await this.completeOrder(order, accountId)
                } catch (error) {};
            };
        } catch (error: any) {
            console.log(`${error.message}`);
        };
    };

    async acceptOffer(accountId: string, offerId: string, email: string, phone: string, first_name: string, last_name: string, userAgent: string) {
        try {
            const BASE_URI: string = "https://dc7l7ioqq6.execute-api.us-east-1.amazonaws.com/test"
            const headers = new Headers({ "Content-Type": "application/json" });
            headers.append("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImVtYWlsIjoiIiwicGFzc3dvcmQiOiIiLCJhY2NvdW50SWQiOiI2NWI3ZTA5ZGNhZmIxZWU2ZWQ2ZDgwMWYifSwiaWF0IjoxNzA2NTQ5NDE5LCJleHAiOjE3MDkxNDE0MTl9.BnNX91NtszOKUZZZSaf08EVVr4GdbdWxEUgMINnZImw")

            const resResult = await fetch(`${BASE_URI}/account/campaign/accept`, {
                method: "POST",
                headers: headers,
                body: JSON.stringify({
                    accountId,
                    offerId,
                    userAgent,
                    email,
                    phone,
                    first_name,
                    last_name
                })
            });

            if (resResult.status !== 200) throw new Error("FAILED_ACCEPTING_OFFER");
            const data = await resResult.json();
            if (!data || !data.success) throw new Error("FAILED_ACCEPTING_OFFER");

            return;
        } catch (error: any) {
            throw new Error(`${error.message}`);
        };
    };

    async completeOrder(order: Order, accountId: string) {
        // determine if order needs to be paid for;
        // if order needs to be paid for; check if paid for by ApplePay;        
        try {
            await mongoose.connect(databaseUri);
            const account = await Account.findById(accountId);
            if (!account) {
                await mongo.updateOrderInQueue(order.orderHash, "unsuccessful");
                throw new Error("NO_ACCOUNT_FOUND");
            };
            await mongoose.disconnect();

            const totalAmount = order.cart.reduce((acc, curr) => acc + curr.discountedPrice, 0);

            if (order.paymentRequired && !order.paymentIsApplePay) {
                const paymentIntent = await new Stripe().createPaymentIntent(
                    totalAmount,
                    account.accountStripeConfig.customerId,
                    order.paymentMethodId!
                ).catch(async (error) => {
                    console.log(error);
                    await mongo.updateOrderInQueue(order.orderHash, "unsuccessful");
                    throw new Error('FAILED_TO_CAPTURE_PAYMENT');
                });


                order.paymentTransaction = {
                    amountPaid: totalAmount,
                    customerId: account.accountStripeConfig.customerId,
                    paymentMethodId: order.paymentMethodId!,
                    paymentIntentId: paymentIntent.id,
                    latestChargeId: paymentIntent.latest_charge?.toString() ?? "not_available",
                    last4: "not_available",
                    timestamp: new Date().getTime()
                };
            };

            const lineItems = order.cart?.map((item) => ({
                quantity: 1,
                variantId: item.options[0],
                pricePaid: item.discountedPrice
            }));

            const processorResult: any = await new Shopify().processAndCompleteOrder(
                {
                    address: order.shippingAddress,
                    email: order.emailAddress,
                    phone: account.phone.value,
                    lineItems: lineItems,
                    presentmentCurrencyCode: "USD",
                    sourceName: "WAVES",
                    shippingLine: {
                        title: order.shippingRate.title,
                        shippingRateHandle: order.shippingRate.handle
                    }
                },
                order.advertiserId,
                accountId,
                order.offerId,
                totalAmount > 0,
                order.orderHash,
                order.paymentTransaction,
            );

            if (!processorResult) {
                if (order.paymentRequired && !order.paymentIsApplePay) {
                    await this.createRefundForCharge(order?.paymentTransaction?.latestChargeId!, accountId).catch((error) => { });
                };

                await mongo.updateOrderInQueue(order.orderHash, "unsuccessful");
                throw new Error("ISSUE_COMPLETING_SHOPIFY_ORDER_A");
            };

            const { confirmedOrderId, advertiser_id } = processorResult;
            if (!confirmedOrderId || !advertiser_id) {
                if (order.paymentRequired && !order.paymentIsApplePay) {
                    await this.createRefundForCharge(order?.paymentTransaction?.latestChargeId!, accountId).catch((error) => { });
                };

                await mongo.updateOrderInQueue(order.orderHash, "unsuccessful");
                throw new Error("ISSUE_COMPLETING_SHOPIFY_ORDER_B");
            };

            await this.acceptOffer(
                accountId,
                order.offerId,
                order.emailAddress,
                "+19543552600",
                order.shippingAddress.firstName,
                order.shippingAddress.lastName,
                "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/114.0.5735.99 Mobile/15E148 Safari/604.1"
            ).catch(async (error: any) => {
                await mongo.updateOrderInQueue(order.orderHash, "unsuccessful");
                throw new Error(`${error.message}`);
            })

            await mongo.updateOrderInQueue(order.orderHash, "successful");
            return processorResult;
        } catch (error: any) {
            await mongo.updateOrderInQueue(order.orderHash, "unsuccessful");
            throw new Error(`${error.message}`);
        };
    };

    async getRecommendedProducts() {
        try {
            const products: any = [];
            const offerData = await new Mongo().getOfferProducts();
            for (const offer of offerData) {
                const offerId = offer?._id;
                const collectionProducts = offer?.collectionProducts;
                collectionProducts.forEach((product: any) => {
                    if (product?.totalInventory > 1) {
                        products.push({
                            ...product,
                            offerId,
                            advertiserName: offer?.advertiser.advertiserName
                        });
                    }
                })
            };


            const sampleProducts = getRandomSample(products, 10);
            return sampleProducts
            // return sampleProducts.sort((a: any, b: any) => Number(a.priceRangeV2.maxVariantPrice.amount) - Number(b.priceRangeV2.maxVariantPrice.amount));
        } catch (error: any) {
            throw new Error(`${error.message}`);
        };
    };

    async deleteAddress(addressId: string, accountId: string) {
        try {
            await mongoose.connect(databaseUri);
            const q = { _id: accountId };
            const u = { $pull: { 'accountShopping.addresses': { addressId: addressId } } };

            const account = await Account.findByIdAndUpdate(q, u);
            return account || null;
        } catch (error) {
            return error;
        };
    };

    async addAddress(address: Address, accountId: string) {
        try {
            await mongoose.connect(databaseUri);

            const account = await Account.findById(accountId);
            if (!account) throw new Error(`NO_ACCOUNT_FOUND`);

            address.addressId = generateRandomId()
            account.accountShopping.addresses.push(address);
            await account.save();

            return account?.accountShopping?.addresses;
        } catch (error) {
            return error;
        };
    };

    async getAllAddresses(accountId: string) {
        try {
            await mongoose.connect(databaseUri);

            const account = await Account.findById(accountId);
            if (!account) throw new Error(`NO_ACCOUNT_FOUND`);

            return account?.accountShopping?.addresses;
        } catch (error) {
            return error;
        };
    };

    async addProductToCart(item: CartItem, accountId: string) {
        try {
            await mongoose.connect(databaseUri);

            const account = await Account.findById(accountId);
            if (!account) throw new Error(`NO_ACCOUNT_FOUND`);



            if (account.accountShopping.cart.some(thing => thing.id === item.id)) {
                throw new Error(`PRODUCT_ALREADY_EXISTS_IN_CART`);
            };

            const totalValueOfCart = account?.accountShopping?.cart?.reduce((acc, curr) => acc + Number(curr?.displayPrice), 0) + Number(item?.displayPrice);
            if (Number(totalValueOfCart) > 150) {
                throw new Error(`CART_VALUE_EXCEEDS_LIMIT`);
            };

            if (account?.accountAcceptedOffers.find(offer => offer?.offer_id?.toString() === item?.offerId.toString())) {
                throw new Error(`PRODUCTS_ALREADY_CLAIMED`);
            }

            item.uuid = generateRandomId();
            await account.save();

            account.addItemToCart(item);
            await account.save();

            return account;
        } catch (error: any) {
            throw new Error(`${error.message}`);
        };
    };

    async deleteProductFromCart(uuid: string, accountId: string) {
        try {
            await mongoose.connect(databaseUri);

            const account = await Account.findById(accountId);
            if (!account) throw new Error(`NO_ACCOUNT_FOUND`);

            account.accountShopping.cart = account.accountShopping.cart.filter(item => item.uuid !== uuid);
            await account.save();

            return account?.accountShopping?.cart;
        } catch (error) {
            return error;
        };
    };

    async getAccountCart(accountId: string) {
        try {
            await mongoose.connect(databaseUri);
            const cart = await Account.findById(accountId, { "accountShopping.cart": 1, _id: 0 });
            return cart?.accountShopping?.cart;
        } catch (error) {
            return error;
        };
    };

    async getAllPurchases(accountId: string) {
        try {
            await mongoose.connect(databaseUri);
            const purchases = await Account.findById(accountId, { "accountShopping.purchases": 1, _id: 0 });
            return purchases?.accountShopping?.purchases;
        } catch (error) {
            return error;
        };
    };

    async getPurchase(accountId: string, orderId: string) {
        try {
            await mongoose.connect(databaseUri);

            const account = await Account.findById(accountId);
            if (!account) throw new Error("NO_ACCOUNT_FOUND");

            const purchases = account?.accountShopping?.purchases;
            const purchase = purchases?.find((doc) => doc.orderId?.split('gid://shopify/DraftOrder/')[1] === orderId);

            return purchase;
        } catch (error) {
            return error;
        };
    };

    async getAccountShopping(accountId: string) {
        try {
            await mongoose.connect(databaseUri);

            const account = await Account.findById(accountId);
            if (!account) throw new Error("NO_ACCOUNT_FOUND");

            return account?.accountShopping;
        } catch (error) {
            return error;
        };
    };

    async updateShippingAddress(shippingAddress: Address, accountId: string) {
        try {
            await mongoose.connect(databaseUri);
            const query = { accountId, "accountShopping.addresses.addressId": shippingAddress.addressId };
            const update = { $set: { "accountShopping.addresses.shippingAddress": shippingAddress } };
            const account = await Account.findByIdAndUpdate(query, update);
            return account;
        } catch (error) {
            return error;
        };
    };

    async createRefundForCharge(chargeId: string, accountId: string) {
        try {
            await mongoose.connect(databaseUri);

            const account = await Account.findById(accountId);
            if (!account) throw new Error("NO_ACCOUNT_FOUND");

            const refund: any = await new Stripe().createRefundForCharge(chargeId);
            if (refund?.status !== "succeeded") return false;
            return true;
        } catch (error) {
            return error;
        };
    };
};

/*
const INCOMING_ORDER = [
    {
        "cart": [
            { 
                "createdAt": 1705358475703, 
                "description": "Unleash the power of free with our incredible Free Product! Enjoy all the benefits of a high-quality product without spending a single dollar. Save money while still getting everything you need. Grab yours today and experience the amazing value for yourself!",
                "discountedPrice": 0,
                "displayPrice": 1,
                "featuredImage": "https://cdn.shopify.com/s/files/1/0741/0096/5680/files/GP_30_VitaminCOil_Packshot_Swatch_1_61ef89b4-ddd2-46b2-b82b-f85459cfcd95.png?v=1705100629",
                "handle": "free-product",
                "id": "free-product",
                "offerId": "6597609d43e9204dfecdcd3d",
                "onlineStoreUrl": "https://waves-test-store-1437.myshopify.com/products/free-product",
                "options": ["gid://shopify/ProductVariant/47390712004912"],
                "quantity": 1,
                "title": "30% Vitamin C Dry Oil",
                "uuid": "IiDkEPzVRm"
            }
        ], 
        "completionFailure": null, 
        "createdAt": 1705359905176, 
        "lastUpdated": 1705359905176, 
        "offerId": "6597609d43e9204dfecdcd3d",
        "advertiserId": "65975ff60fda98108a77baf3",
        "paymentIsApplePay": false, 
        "paymentRequired": false,
        "paymentMethodId": null,
        "paymentTransaction": null, 
        "shippingAddress": { 
            "address1": "2501 N Lincoln St", 
            "address2": "", 
            "addressId": "9dSaChrsyJ", 
            "city": "Arlington", 
            "countryCode": "US", 
            "firstName": "Roger Nowakowski", 
            "lastName": "", 
            "provinceCode": "VA", 
            "zip": "22207" 
        }, 
        "shippingRate": { 
            "amount": "4.9", 
            "handle": "79da7f8d68e18f7616e6841112693fce", 
            "offerId": "6597609d43e9204dfecdcd3d", 
            "offerName": "Loro Pure", 
            "title": "Economy" 
        }, 
        "wavesCompletion": "processing" as ProcessingStatus,
        "emailAddress":"rog.nowak@gmail.com"
    }
];

[
    {
        "createdAt": 1705358470312,
        "description": "Experience maximum comfort and benefit your body and the environment with our Organic Compression T-Shirt. Made from 100% organic cotton, this shirt provides the perfect amount of compression for improved muscle performance and recovery, while also reducing your environmental impact.",
        "discountedPrice": 6,
        "displayPrice": 29.99,
        "featuredImage": "https://cdn.shopify.com/s/files/1/0741/0096/5680/files/OT11FINAL_800x_6ee14e95-8901-4b03-b034-1dd37733674e.jpg?v=1702427401",
        "handle": "compression-t-shirt",
        "id": "compression-t-shirt",
        "offerId": "6597609d43e9204dfecdcd3d",
        "onlineStoreUrl": "https://waves-test-store-1437.myshopify.com/products/compression-t-shirt",
        "options": ["gid://shopify/ProductVariant/47263107088688"],
        "quantity": 1,
        "title": "Compression T-Shirt",
        "uuid": "76GEzXH8nS"
    },
    { 
        "createdAt": 1705358475703, 
        "description": "Unleash the power of free with our incredible Free Product! Enjoy all the benefits of a high-quality product without spending a single dollar. Save money while still getting everything you need. Grab yours today and experience the amazing value for yourself!",
        "discountedPrice": 0,
        "displayPrice": 1,
        "featuredImage": "https://cdn.shopify.com/s/files/1/0741/0096/5680/files/GP_30_VitaminCOil_Packshot_Swatch_1_61ef89b4-ddd2-46b2-b82b-f85459cfcd95.png?v=1705100629",
        "handle": "free-product",
        "id": "free-product",
        "offerId": "6597609d43e9204dfecdcd3d",
        "onlineStoreUrl": "https://waves-test-store-1437.myshopify.com/products/free-product",
        "options": ["gid://shopify/ProductVariant/47390712004912"],
        "quantity": 1,
        "title": "30% Vitamin C Dry Oil",
        "uuid": "IiDkEPzVRm"
    }
];
*/
