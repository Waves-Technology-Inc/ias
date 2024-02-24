interface BillingAddress {
    address1: string;
    address2?: string |null;
    city: string;
    countryCode: string;
    firstName: string;
    lastName: string;
    provinceCode: string;
    zip: string;
};

interface LineItem {
    quantity: number;
    variantId: string;
    pricePaid: number;
};

interface ShippingMethod {
    title: string;
    shippingRateHandle: string;
}

export interface Order {
    address: BillingAddress;
    email?: string;
    phone?: string;
    lineItems: LineItem[];
    presentmentCurrencyCode: string;
    sourceName?: string;
    shippingLine: ShippingMethod;
};