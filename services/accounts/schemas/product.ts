import mongoose, { Schema } from 'mongoose';

export interface Option {
    name: string;
    value: string;
};

export interface CartItem {
    title: string;
    description: string;
    featuredImage: string;
    handle: string;
    id: string;
    onlineStoreUrl: string;
    displayPrice: string;
    discountedPrice: string;
    quantity: number
    uuid?: string;
    options: any[];
    offerId: string;
    createdAt: number;
};