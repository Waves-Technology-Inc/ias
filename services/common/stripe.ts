import stripe from 'stripe';

export class Stripe {
    stripe: stripe;

    constructor () {
        this.stripe = new stripe('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', {
            apiVersion: '2023-10-16',
        });
    };

    async createRefundForCharge (chargeId:string) {
        try {
            const refund = await this.stripe.refunds.create({
                charge:chargeId
            });
            
            return refund;
        } catch (error) {
            return error;
        };
    };

    async createPaymentIntent (amount:number, customerId:string, paymentMethodId:string, transferToDestination?:boolean, destination?:string) {
        try {
            const intentObject:any = {
                amount: Math.floor((amount) * 100),
                currency: 'usd',
                customer: customerId,
                confirm: true,
                off_session: true,
                payment_method: paymentMethodId
            };
    
            const paymentIntent = await this.stripe.paymentIntents.create(intentObject);
            return paymentIntent;
        } catch (error) {
            console.log(error);
            throw new Error(`ERROR_CREATING_STRIPE_PAYMENT`);
        };
    };
};