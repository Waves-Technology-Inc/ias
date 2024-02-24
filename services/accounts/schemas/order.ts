import mongoose from "mongoose";

export interface Address {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string | null; 
    city: string;
    provinceCode: string;
    countryCode: string;
    zip: string;
    addressId?: string | null;
}


interface CartItem {
    title: string;
    description: string;
    featuredImage: string;
    handle: string;
    id: string;
    onlineStoreUrl: string;
    displayPrice: number;
    discountedPrice: number;
    quantity: number
    uuid?: string;
    options: string[];
    offerId: string;
    createdAt: number;
};

interface ShippingRate {
    handle: string;
    offerId: string;
    offerName: string;
    amount: string;
    title: string;
};

interface ShopifyStripePayment {
    amountPaid: number;
    customerId: string;
    paymentMethodId: string;
    paymentIntentId: string;
    latestChargeId: string;
    last4?:string;
    timestamp: number;
};

export type ProcessingStatus = "processing" | "unsuccessful" | "successful";

export interface Order {
    cart: CartItem[];
    emailAddress: string;
    paymentRequired: boolean;
    paymentIsApplePay: boolean;
    paymentMethodId?: string | null;
    paymentTransaction?: ShopifyStripePayment | null;
    shippingAddress: Address;
    shippingRate: ShippingRate;
    wavesCompletion: ProcessingStatus;
    completionFailure?: string | null;
    offerId: string;
    accountId: string;
    advertiserId: string;
    advertiser?: {
        advertiserName?: string | null;
        advertiserLogo?: string | null;
    };
    createdAt: number;
    lastUpdated: number;
    orderHash?: string | null;
    incomingOrderHash?: string | null;
};


