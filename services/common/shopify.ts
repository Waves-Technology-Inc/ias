import axios from 'axios';

export class Shopify {
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
};