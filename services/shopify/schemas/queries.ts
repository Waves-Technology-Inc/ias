import { Order } from "./order";

export const draftOrderCreate = (order: Order) => {
    return JSON.stringify({
        query: `mutation draftOrderCreate($input: DraftOrderInput!) {
            draftOrderCreate(input: $input) {
              draftOrder {
                id,
              }
              userErrors {
                field
                message
              }
            }
        }`,
        variables: {
            "input": {
                "billingAddress": {
                    "address1": order.address.address1,
                    "address2": order.address.address2,
                    "city": order.address.city,
                    "countryCode": order.address.countryCode,
                    "firstName": order.address.firstName,
                    "lastName": order.address.lastName,
                    "provinceCode": order.address.provinceCode,
                    "zip": order.address.zip
                },
                "shippingAddress": {
                    "address1": order.address.address1,
                    "address2": order.address.address2,
                    "city": order.address.city,
                    "countryCode": order.address.countryCode,
                    "firstName": order.address.firstName,
                    "lastName": order.address.lastName,
                    "provinceCode": order.address.provinceCode,
                    "zip": order.address.zip
                },
                "email": order.email,
                "lineItems": order.lineItems.map((item) => ({quantity:1, variantId:item?.variantId})),
                "phone": order.phone,
                "presentmentCurrencyCode": order.presentmentCurrencyCode,
                "sourceName": "WAVES",
                "shippingLine": {
                    "title":order.shippingLine.title,
                    "shippingRateHandle":order.shippingLine.shippingRateHandle
                }
            },
        }
    });
};

export const completeDraftOrder = (orderId: string) => {
    return JSON.stringify({
        query: `mutation draftOrderComplete($id: ID!) {
            draftOrderComplete(id: $id) {
              draftOrder {
                id,
                email
                totalPrice,
                shippingAddress {
                    address1,
                    address2,
                    city,
                    provinceCode,
                    countryCodeV2,
                    zip
                    firstName,
                    lastName
                }
                lineItems (first: 10) {
                    nodes {
                        title,
                        variant {
                            id
                            title
                        }
                        quantity,
                        image {
                            url
                        }
                    }
                }
              }
              userErrors {
                field
                message
              }
            }
        }`,
        variables: {
            "id": orderId
        },
    });
};

export const getDraftOrder = (orderId: string) => {
    return JSON.stringify({
        query: `query {
            draftOrder(id: "${orderId}") {
                  id
                  status
                  order {
                      confirmationNumber
                      confirmed
                      displayFulfillmentStatus
                      shippingAddress {
                          address1,
                          address2,
                          city,
                          provinceCode,
                          countryCodeV2,
                          zip,
                          firstName,
                          lastName
                      }
                      lineItems (first:5) {
                          nodes {
                              title
                              variantTitle
                              variant {
                                  displayName
                                  title
                                  selectedOptions {
                                      name
                                      value
                                  }
                              }
                              quantity
                              image {
                                  url
                              }
                          }
                      }
                      fulfillments (first:3) {
                          name
                          displayStatus,
                          estimatedDeliveryAt,
                          status
                          trackingInfo (first: 3) {
                              number,
                              url
                          }
                      }
                  }
              }
          }`
    });
};