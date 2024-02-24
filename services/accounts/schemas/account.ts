import crypto from 'crypto';
import mongoose, { Document, ObjectId, Schema, mongo } from 'mongoose';
import { CartItem } from './product';

export type Region = 'US' | 'CA' | 'UK' | 'AU';

export type AgeRange = '13-17' | '18-24' | '25-34' | '35-44' | '45-64' | '65-';

export interface Address {
    firstname: string;
    lastname: string;
    address1: string;
    address2?: string | null; 
    city: string;
    provinceCode: string;
    countryCode: string;
    zip: string;
    addressId?: string | null;
}


interface LineItem {
    title: string;
    variantTitle: string;
    quantity: number;
    imageUrl: string;
    pricePaid: number;
};

export interface ShopifyStripePayment {
    amountPaid: number;
    customerId: string;
    paymentMethodId: string;
    paymentIntentId: string;
    latestChargeId: string;
    last4?:string;
    timestamp: number;
};

export interface Purchase {
    items: LineItem[];
    orderId: string;
    orderHash:string;
    discountRate?: number | null;
    customerEmail: string;
    shippingAddress: Address;
    requiredPayment: boolean;
    transaction?: ShopifyStripePayment | null;
    offerId: mongoose.Types.ObjectId;
    advertiserId: mongoose.Types.ObjectId;
    createdAt: number;
};

export interface RequestedOffer {
    offer_id: Schema.Types.ObjectId;
    offer_status: RequestStatus;
}

export interface AcceptedOffer {
    offer_id: Schema.Types.ObjectId;
    offer_status: OfferStatus;
    submissions: Schema.Types.ObjectId[];
    acceptedAt?: Date;
}

export interface CompletedOffer {
    offer_id: Schema.Types.ObjectId;
    submission_id: Schema.Types.ObjectId;
    offer_status: OfferStatus;
}

enum OfferStatus {
    PENDING,
    COMPLETED,
    FAILED,
}

enum RequestStatus {
    PENDING,
    APPROVED,
    REJECTED,
}

export interface IGenderDemographics {
    malePercentage: number;
    femalePercentage: number;
}

export interface IAgeDemographic {
    ageRange: AgeRange;
    percentage: number;
}

export interface ILocationDemographic {
    region: Region;
    percentage: number;
}

export interface IAudienceDemographics {
    genderDemographics: IGenderDemographics;
    ageDemographics: IAgeDemographic[];
    locationDemographics: ILocationDemographic[];
}

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

// Define the interface for the Account document
interface IAccount extends Document {
    markAdmitted(): void;
    setPassword(password: string): void;
    validPassword(password: string): boolean;
    setExternalAccount(id: Schema.Types.ObjectId, platform: string): void;
    pushInterests(interests: { primary?: string[]; secondary?: string[] }[]): void;
    checkIfAcceptedOffer(offerId: ObjectId): boolean;
    userAcceptedOffer(offerId: ObjectId): void;
    addRequestedOffer(offerId: ObjectId): void;
    addExternalPaymentAccount(externalPaymentAccountId: string): void;
    checkIfRequestedOffer(offerId: ObjectId): boolean;
    getRequestedOffer(offerId: string): RequestedOffer;
    transferApprovedRequestedOffer(offerId: string): void;
    updateRejectedRequestedOffer(offerId: string): void;
    getNonElegibleOfferList(): string[];
    addSubmissionToAcceptedOffer(offerId: Schema.Types.ObjectId, submissionId: Schema.Types.ObjectId): void;
    removeExternalAccount(platform: string): void;
    setInternalScore(score: number): void;
    addItemToCart(item: CartItem): void;
    clearCart ():void;
    addItemToPurchases (purchase: Purchase): void;
    transferAcceptedOffer(offerId: Schema.Types.ObjectId, submissionId: Schema.Types.ObjectId): void;
    refundTransactionStatus(orderId:string): void;
    email: {
        value: string;
        verified: boolean;
    };
    phone: {
        value: string;
        verified: boolean;
    };
    name: {
        first_name: string;
        last_name: string;
    };
    admitted: boolean;
    dateOfBirth: string;
    password: string;
    accountDescription: string;
    accountHandle: string;
    accountExternalScore: mongoose.Types.Decimal128;
    accountInternalScore: mongoose.Types.Decimal128;
    accountInterests: {
        primary: string[];
        secondary: string[];
    };
    accountExternals: {
        instagramExternal: ObjectId;
        tiktokExternal: ObjectId;
        twitterExternal: ObjectId;
        youtubeExternal: ObjectId;
    };
    accountAttributes: {
        identifiedGender: string;
    };
    accountMedia: {
        profilePicture: string;
    };
    accountCompletedOffers: CompletedOffer[];
    accountAcceptedOffers: AcceptedOffer[];
    accountRequestedOffers: RequestedOffer[];
    accountStripeConfig: {
        customerId: string;
        accountId: string;
    };
    affiliateId: Schema.Types.ObjectId;
    wavesPageId: Schema.Types.ObjectId;
    creatorQuestionsAndAnswers: {
        question: string;
        answer: string;
    }[];
    accountShopping: {
        cart: any[];
        purchases: Purchase[];
        addresses: Address[];
    };
}

const creatorQuestionsAndAnswersSchema = new Schema({
    question: {
        type: String,
        required: true,
    },
    answer: {
        type: String,
        required: true,
    },
});

// Define the schema for the Account collection
const accountSchema = new Schema<IAccount>({
    email: {
        value: {
            type: String,
            required: false,
            unique: false,
        },
        verified: {
            type: Boolean,
            required: false,
            default: false,
        },
    },
    phone: {
        value: {
            type: String,
            required: true,
            unique: true,
        },
        verified: {
            type: Boolean,
            required: false,
            default: false,
        },
    },
    name: {
        first_name: {
            type: String,
            required: false,
            default:null
        },
        last_name: {
            type: String,
            required: false,
            default:null
        },
    },
    admitted: {
        type: Boolean,
        required: false,
        default: true,
    },
    dateOfBirth: {
        type: String,
        required: false,
        default: null,
    },
    password: {
        type: String,
        required: false,
        default: null
    },
    accountDescription: {
        type: String,
        required: false,
    },
    accountHandle: {
        type: String,
        required: false,
    },
    accountExternalScore: {
        type: Schema.Types.Decimal128,
        required: false,
        default: 1.0,
    },
    accountInternalScore: {
        type: Schema.Types.Decimal128,
        required: false,
        default: 1.0,
    },
    accountInterests: {
        primary: [String],
        secondary: [String],
    },
    accountExternals: {
        instagramExternal: { type: Schema.Types.ObjectId, required: false, default: null },
        tiktokExternal: { type: Schema.Types.ObjectId, required: false, default: null },
        twitterExternal: { type: Schema.Types.ObjectId, required: false, default: null },
        youtubeExternal: { type: Schema.Types.ObjectId, required: false, default: null },
    },
    accountAttributes: {
        identifiedGender: {
            type: String,
            required: false,
        },
    },
    accountMedia: {
        profilePicture: {
            type: String,
            required: false,
            default: 'https://storage.googleapis.com/waves_general_bucket/app_assets/default_pfp.png',
        },
    },
    accountCompletedOffers: [
        {
            offer_id: { type: Schema.Types.ObjectId, required: true },
            submission_id: { type: Schema.Types.ObjectId, required: true },
            offer_status: { type: String, enum: OfferStatus, required: true },
        },
    ],
    accountAcceptedOffers: [
        {
            offer_id: { type: Schema.Types.ObjectId, required: true },
            offer_status: { type: String, enum: OfferStatus, required: true },
            submissions: [{ type: Schema.Types.ObjectId, required: true }],
            acceptedAt: { type: Date, required: false, default: Date.now() },
        },
    ],
    accountRequestedOffers: [
        {
            offer_id: { type: Schema.Types.ObjectId, required: true },
            offer_status: { type: String, enum: RequestStatus, required: true },
        },
    ],
    accountStripeConfig: {
        customerId: {
            type: String,
            required: false,
            default: null,
        },
        accountId: {
            type: String,
            required: false,
            default: null,
        },
    },
    affiliateId: {
        type: Schema.Types.ObjectId,
        required: false,
        default: null,
    },
    wavesPageId: {
        type: Schema.Types.ObjectId,
        required: false,
        default: null,
    },
    creatorQuestionsAndAnswers: {
        type: [creatorQuestionsAndAnswersSchema],
        required: false,
        default: [],
    },
    accountShopping: {
        cart: [{
            type: {},
            required:false,
        }],
        purchases: [{
            type: {},
            required:false,
        }],
        addresses: [{
            type: {},
            required:false
        }]
    },
});

accountSchema.methods.markAdmitted = function () {
    this.admitted = true;
    return;
};

accountSchema.methods.checkIfAcceptedOffer = function (offerId: Schema.Types.ObjectId) {
    return this.accountAcceptedOffers.some((offer: AcceptedOffer) => offer.offer_id.toString() === offerId.toString());
};

accountSchema.methods.userAcceptedOffer = function (offerId: ObjectId) {
    console.log('method userAcceptedOffer');
    this.accountAcceptedOffers.push({
        offer_id: offerId,
        offer_status: 'PENDING',
    });
};

accountSchema.methods.setPassword = function (password: string) {
    const salt = '6a4d1e1136f1975d1104264d0479a6a7';
    this.password = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return;
};

accountSchema.methods.validPassword = function (password: string) {
    const salt = '6a4d1e1136f1975d1104264d0479a6a7';
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return this.password === hash;
};

accountSchema.methods.pushInterests = function (interests: { primary?: string[]; secondary?: string[] }) {
    if (interests.primary && interests.primary.length > 0) {
        this.accountInterests.primary.push(...interests.primary);
    }
    if (interests.secondary && interests.secondary.length > 0) {
        this.accountInterests.secondary.push(...interests.secondary);
    }
};

accountSchema.methods.setExternalAccount = function (id: ObjectId, platform: string) {
    switch (platform) {
        case 'TIKTOK':
            this.accountExternals.tiktokExternal = id;
            break;
        case 'INSTAGRAM':
            this.accountExternals.instagramExternal = id;
            break;
        default:
            break;
    }
};

accountSchema.methods.addRequestedOffer = function (offerId: ObjectId) {
    this.accountRequestedOffers.push({
        offer_id: offerId,
        offer_status: 'PENDING',
    });
};

accountSchema.methods.checkIfRequestedOffer = function (offerId: Schema.Types.ObjectId) {
    return this.accountRequestedOffers.some((offer: RequestedOffer) => offer.offer_id.toString() === offerId.toString());
};

accountSchema.methods.getRequestedOffer = function (offerId: string) {
    return this.accountRequestedOffers.find((offer: RequestedOffer) => offer.offer_id.toString() === offerId);
};

accountSchema.methods.transferApprovedRequestedOffer = function (offerId: string) {
    const offer = this.getRequestedOffer(offerId);
    if (offer) {
        this.accountRequestedOffers.splice(this.accountRequestedOffers.indexOf(offer), 1);
        this.accountAcceptedOffers.push({
            offer_id: offer.offer_id,
            offer_status: 'PENDING',
        });
    }
};

accountSchema.methods.updateRejectedRequestedOffer = function (offerId: string) {
    // update the specific offer status to rejected
    // do not remove it from the array

    const offer = this.getRequestedOffer(offerId);

    if (offer) {
        offer.offer_status = 'REJECTED';
    }
};

accountSchema.methods.addExternalPaymentAccount = function (externalPaymentAccountId: string) {
    try {
        this.accountExternalPaymentAccounts.push({
            external_payment_account_id: externalPaymentAccountId,
            external_payment_history: [],
        });
    } catch (error) {
        throw new Error(`failed addExternalPaymentAccount db: ${error}`);
    }
};

accountSchema.methods.getNonElegibleOfferList = function () {
    try {
        // get list of all object ids in accountRequestedOffers and accountAcceptedOffers

        const requestedOfferIds = this.accountRequestedOffers.map((offer: RequestedOffer) => offer.offer_id.toString());
        const acceptedOfferIds = this.accountAcceptedOffers.map((offer: AcceptedOffer) => offer.offer_id.toString());

        // combine the two lists and return it

        return requestedOfferIds.concat(acceptedOfferIds);
    } catch (error) {
        throw new Error(`failed getNonElegibleOfferList db: ${error}`);
    }
};

accountSchema.methods.addSubmissionToAcceptedOffer = function (offerId: Schema.Types.ObjectId, submissionId: Schema.Types.ObjectId) {
    try {
        const offer = this.accountAcceptedOffers.find((offer: AcceptedOffer) => offer.offer_id.toString() === offerId.toString());

        if (offer) {
            offer.submissions.push(submissionId);
        }
    } catch (error) {
        throw new Error(`failed addSubmissionToAcceptedOffer db: ${error}`);
    }
};

accountSchema.methods.removeExternalAccount = function (platform: string) {
    switch (platform) {
        case 'TIKTOK':
            this.accountExternals.tiktokExternal = null;
            break;
        case 'INSTAGRAM':
            this.accountExternals.instagramExternal = null;
            break;
        default:
            break;
    }
};

accountSchema.methods.setInternalScore = function (score: Schema.Types.Decimal128) {
    // conver number to Schema.Types.Decimal128

    if (score > this.accountInternalScore) {
        this.accountInternalScore = score;
    }
};

accountSchema.methods.transferAcceptedOffer = function (offerId: Schema.Types.ObjectId, submissionId: Schema.Types.ObjectId) {
    // update submission within offer in accountAcceptedOffers to accountCompletedOffers:

    const offer = this.accountAcceptedOffers.find((offer: AcceptedOffer) => offer.offer_id.toString() === offerId.toString());

    if (offer) {
        if (offer.submissions.length === 1) {
            offer.offer_status = 'COMPLETED';
        }
        // only remove the specific submission from the submissions array, all other submissions in the array should remain:

        offer.submissions.splice(offer.submissions.indexOf(submissionId), 1);

        // add the offer to accountCompletedOffers:

        this.accountCompletedOffers.push({
            offer_id: offerId,
            submission_id: submissionId,
            offer_status: 'COMPLETED',
        });
    }
};

accountSchema.methods.addItemToCart = function (item: CartItem) {
    this.accountShopping.cart.push(item);
};

accountSchema.methods.addItemToPurchases = function (purchase: Purchase) {
    this.accountShopping.purchases.push(purchase);
};

accountSchema.methods.clearCart = function () {
    this.accountShopping.cart = [];
}

accountSchema.methods.refundTransactionStatus = function (orderId:string) {
    this.purchase = this.accountShopping.purchases?.find((doc:Purchase) => doc.orderId?.split('gid://shopify/DraftOrder/')[1] === orderId);
    this.purchase.transaction.refunded = true
}

const Account = mongoose.model<IAccount>('Account', accountSchema);
export default Account;
export { IAccount };