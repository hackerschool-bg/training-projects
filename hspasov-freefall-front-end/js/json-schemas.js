const ajv = new Ajv();

const validators = { // eslint-disable-line no-unused-vars
  getValidateSubscriptionReq: function () {
    const subscriptionRequestSchema = {
      '$schema': 'http://json-schema.org/draft-07/schema#',
      '$id': 'http://10.20.1.155:3000/subscriptionrequest.schema.json',
      'title': 'Subscription request',
      'description': 'Contains the request of subscribe or unsubscribe method',
      'type': 'object',
      'properties': {
        'v': {
          'title': 'API version',
          'description': 'FreeFall API version',
          'type': 'string',
        },
        'fly_from': {
          'title': 'Departure airport',
          'description': 'The id of the departure airport',
          'type': ['number', 'string'],
        },
        'fly_to': {
          'title': 'Arrival airport',
          'description': 'The id of the arrival airport',
          'type': ['number', 'string'],
        },
      },
    };
    return ajv.compile(subscriptionRequestSchema);
  },

  getValidateSubscriptionRes: function () {
    const subscriptionResponseSchema = {
      '$schema': 'http://json-schema.org/draft-07/schema#',
      '$id': 'http://10.20.1.155:3000/subscriptionresponse.schema.json',
      'title': 'Subscription response',
      'description': 'Contains the response of subscribe or unsubscribe method',
      'type': 'object',
      'properties': {
        'status_code': {
          'title': 'Title',
          'description': 'Indicator for the result of the request',
          'type': ['string', 'number'],
        },
      },
    };
    return ajv.compile(subscriptionResponseSchema);
  },

  getValidateSearchReq: function () {
    const searchRequestSchema = {
      '$schema': 'http://json-schema.org/draft-07/schema#',
      '$id': 'http://10.20.1.155:3000/searchrequest.schema.json',
      'title': 'Search request',
      'description': 'Contains the parameters for search',
      'type': 'object',
      'properties': {
        'v': {
          'title': 'API Version',
          'description': 'FreeFall API version',
          'type': 'string',
        },
        'fly_from': {
          'title': 'Departure airport id',
          'description': 'The id of the departure airport',
          'type': ['number', 'string'],
        },
        'fly_to': {
          'title': 'Arrival airport id',
          'description': 'The id of the arrival airport',
          'type': ['number', 'string'],
        },
        'price_to': {
          'title': 'Maximum price',
          'description': 'Filter for a maximum price',
          'type': 'number',
          'minimum': 0,
        },
        'currency': {
          'title': 'Currency',
          'description': 'The currency in which the data has to be in the response',
          'type': 'string',
          'enum': ['BGN', 'EUR', 'USD'],
        },
        'date_from': {
          'title': 'Date from',
          'description': 'Filter for the earliest flight departure',
          'type': 'string',
          'format': 'date',
        },
        'date_to': {
          'title': 'Date to',
          'description': 'Filter for the latest flight arrival',
          'type': 'string',
          'format': 'date',
        },
        'sort': {
          'title': 'Sort by',
          'description': 'Filter for how the data in the response should be sorted',
          'type': 'string',
          'enum': ['price', 'duration'],
        },
        'max_fly_duration': {
          'title': 'Maximum fly duration',
          'description': 'The maximum fly time in a route (sum of the duration of all flights in a route)',
          'type': 'number',
          'minimum': 0,
        },
      },
      'required': ['v', 'fly_from', 'fly_to'],
    };
    return ajv.compile(searchRequestSchema);
  },

  getValidateSearchRes: function () {
    const searchResponseSchema = {
      '$schema': 'http://json-schema.org/draft-07/schema#',
      '$id': 'http://10.20.1.155:3000/searchresponse.schema.json',
      'title': 'Search response',
      'description': 'Contains the response of search',
      'type': 'object',
      'properties': {
        'status_code': {
          'title': 'Status code',
          'description': 'Indicator for the result of the request',
          'type': ['string', 'number'],
        },
        'currency': {
          'title': 'Currency',
          'description': 'The currency in which the data in the response is',
          'type': 'string',
          'enum': ['BGN', 'EUR', 'USD'],
        },
        'routes': {
          'title': 'Routes',
          'description': 'An array of possible ways to travel between two airports',
          'type': 'array',
          'items': {
            'type': 'object',
            'properties': {
              'booking_token': {
                'title': 'Booking token',
                'description': 'Url to a page from where tickets for route can be bought',
                'type': 'string',
              },
              'price': {
                'title': 'Price',
                'description': 'The cost of the whole route',
                'type': 'number',
              },
              'route': {
                'title': 'Route',
                'description': 'An array, containing the flights in a route',
                'type': 'array',
                'items': {
                  'type': 'object',
                  'properties': {
                    'airport_from': {
                      'title': 'Departure airport',
                      'description': 'Departure airport',
                      'type': 'string',
                    },
                    'airport_to': {
                      'title': 'Arrival airport',
                      'description': 'Arrival airport',
                      'type': 'string',
                    },
                    'return': {
                      'title': 'Return',
                      'description': 'Boolean for flight direction - passenger going (false) or returning (true)',
                      'type': 'boolean',
                    },
                    'dtime': {
                      'title': 'Departure time',
                      'description': 'Departure time',
                      'type': 'string',
                      'format': 'date-time',
                    },
                    'atime': {
                      'title': 'Arrival time',
                      'description': 'Arrival time',
                      'type': 'string',
                      'format': 'date-time',
                    },
                    'airline_logo': {
                      'title': 'Airline logo',
                      'description': 'Url to the logo of the airline company providing the ticket',
                      'type': 'string',
                    },
                    'airline_name': {
                      'title': 'Airline name',
                      'description': 'The name of the airline',
                      'type': 'string',
                    },
                    'flight_number': {
                      'title': 'Flight number',
                      'description': 'The number of the flight',
                      'type': 'string',
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    return ajv.compile(searchResponseSchema);
  },

  getValidateSendErrorReq: function () {
    const sendErrorRequestSchema = {
      '$schema': 'http://json-schema.org/draft-07/schema#',
      '$id': 'http://10.20.1.155:3000/senderrorrequest.schema.json',
      'title': 'Send error request',
      'description': 'Contains the response of sendError method',
      'type': 'object',
      'properties': {
        'v': {
          'title': 'API version',
          'description': 'FreeFall API version',
          'type': 'string',
        },
        'msg': {
          'title': 'Error message',
          'description': 'Message with information about the error',
          'type': 'string',
        },
        'trace': {
          'title': 'Trace',
          'description': 'Array of trace messages',
          'type': 'array',
          'items': {
            'type': 'string',
          },
        },
      },
    };
    return ajv.compile(sendErrorRequestSchema);
  },

  getValidateSendErrorRes: function () {
    const sendErrorResponseSchema = {
      '$schema': 'http://json-schema.org/draft-07/schema#',
      '$id': 'http://10.20.1.155:3000/senderrorresponse.schema.json',
      'title': 'Send error response',
      'description': 'Contains the response of sendError method',
      'type': 'object',
      'properties': {
        'status_code': {
          'title': 'Status code',
          'description': 'Indicator for the result of the request',
          'type': ['string', 'number'],
        },
      },
    };
    return ajv.compile(sendErrorResponseSchema);
  },

  getValidateErrorRes: function () {
    const errorResponseSchema = {
      '$schema': 'http://json-schema.org/draft-07/schema#',
      '$id': 'http://10.20.1.155:3000/errorresponse.schema.json',
      'title': 'Send error response',
      'type': 'object',
      'properties': {
        'code': {
          'title': 'Error code',
          'type': 'number',
        },
        'message': {
          'title': 'Error message',
          'type': 'string',
        },
        'data': {
          'title': 'Error data',
          'type': 'object',
        },
      },
    };
    return ajv.compile(errorResponseSchema);
  },

  getValidateListAirportsRes: function () {
    const listAirportsSchema = {
      '$schema': 'http://json-schema.org/draft-07/schema#',
      '$id': 'http://10.20.1.155:3000/listairportsresponse.schema.json',
      'title': 'List airports response',
      'type': 'object',
      'properties': {
        'airports': {
          'type': 'array',
          'title': 'Airports list',
          'items': {
            'type': 'object',
            'properties': {
              'id': {
                'title': 'Airport id from database',
                'type': 'string',
              },
              'iata_code': {
                'title': 'Airport IATA code',
                'type': 'string',
              },
              'name': {
                'title': 'Airport name',
                'type': 'string',
              },
            },
          },
        },
      },
    };
    return ajv.compile(listAirportsSchema);
  },
};
