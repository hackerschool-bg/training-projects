const ajv = new Ajv();

function getValidateSearchReq () { // eslint-disable-line no-unused-vars
  const searchRequestSchema = {
    '$schema': 'http://json-schema.org/draft-07/schema#',
    '$id': 'http://10.20.1.155:3000/searchrequest.schema.json',
    'title': 'Search request',
    'description': 'Contains the parameters for search',
    'type': 'object',
    'properties': {
      'v': {
        'description': 'FreeFall API version',
        'type': 'string',
      },
      'fly_from': {
        'description': 'The id of the departure airport',
        'type': ['number', 'string'],
      },
      'fly_to': {
        'description': 'The id of the arrival airport',
        'type': ['number', 'string'],
      },
      'price_to': {
        'description': 'Filter for a maximum price',
        'type': 'number',
        'minimum': 0,
      },
      'currency': {
        'description': 'The currency in which the data has to be in the response',
        'type': 'string',
        'enum': ['BGN', 'EUR', 'USD'],
      },
      'date_from': {
        'description': 'Filter for the earliest flight departure',
        'type': 'string',
        'format': 'date',
      },
      'date_to': {
        'description': 'Filter for the latest flight arrival',
        'type': 'string',
        'format': 'date',
      },
      'sort': {
        'description': 'Filter for how the data in the response should be sorted',
        'type': 'string',
        'enum': ['price', 'duration'],
      },
      'max_fly_duration': {
        'description': 'The maximum fly time in a route (sum of the duration of all flights in a route)',
        'type': 'number',
        'minimum': 0,
      },
    },
    'required': ['v', 'fly_from', 'fly_to'],
  };
  return ajv.compile(searchRequestSchema);
}

function getValidateSearchRes () { // eslint-disable-line no-unused-vars
  const searchResponseSchema = {
    '$schema': 'http://json-schema.org/draft-07/schema#',
    '$id': 'http://10.20.1.155:3000/searchresponse.schema.json',
    'title': 'Search response',
    'description': 'Contains the response of search',
    'type': 'object',
    'properties': {
      'status_code': {
        'description': 'Indicator for the result of the request',
        'type': ['string', 'number'],
      },
      'currency': {
        'description': 'The currency in which the data in the response is',
        'type': 'string',
        'enum': ['BGN', 'EUR', 'USD'],
      },
      'routes': {
        'description': 'An array of possible ways to travel between two airports',
        'type': 'array',
        'items': {
          'type': 'object',
          'properties': {
            'booking_token': {
              'description': 'Url to a page from where tickets for route can be bought',
              'type': 'string',
            },
            'price': {
              'description': 'The cost of the whole route',
              'type': 'number',
            },
            'route': {
              'description': 'An array, containing the flights in a route',
              'type': 'array',
              'items': {
                'type': 'object',
                'properties': {
                  'airport_from': {
                    'description': 'Departure airport',
                    'type': 'string',
                  },
                  'airport_to': {
                    'description': 'Arrival airport',
                    'type': 'string',
                  },
                  'return': {
                    'description': 'Boolean for flight direction - passenger going (false) or returning (true)',
                    'type': 'boolean',
                  },
                  'dtime': {
                    'description': 'Departure time',
                    'type': 'string',
                    'format': 'date-time',
                  },
                  'atime': {
                    'description': 'Arrival time',
                    'type': 'string',
                    'format': 'date-time',
                  },
                  'airline_logo': {
                    'description': 'Url to the logo of the airline company providing the ticket',
                    'type': 'string',
                  },
                  'airline_name': {
                    'description': 'The name of the airline',
                    'type': 'string',
                  },
                  'flight_number': {
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
}

function getValidateSubscriptionReq () { // eslint-disable-line no-unused-vars
  const subscriptionRequestSchema = {
    '$schema': 'http://json-schema.org/draft-07/schema#',
    '$id': 'http://10.20.1.155:3000/subscriptionrequest.schema.json',
    'title': 'Subscription request',
    'description': 'Contains the request of subscribe or unsubscribe method',
    'type': 'object',
    'properties': {
      'v': {
        'description': 'FreeFall API version',
        'type': 'string',
      },
      'fly_from': {
        'description': 'The id of the departure airport',
        'type': ['number', 'string'],
      },
      'fly_to': {
        'description': 'The id of the arrival airport',
        'type': ['number', 'string'],
      },
    },
  };
  return ajv.compile(subscriptionRequestSchema);
}

function getValidateSubscriptionRes () { // eslint-disable-line no-unused-vars
  const subscriptionResponseSchema = {
    '$schema': 'http://json-schema.org/draft-07/schema#',
    '$id': 'http://10.20.1.155:3000/subscriptionresponse.schema.json',
    'title': 'Subscription response',
    'description': 'Contains the response of subscribe or unsubscribe method',
    'type': 'object',
    'properties': {
      'status_code': {
        'description': 'Indicator for the result of the request',
        'type': ['string', 'number'],
      },
    },
  };
  return ajv.compile(subscriptionResponseSchema);
}

function getValidateSendErrorReq () { // eslint-disable-line no-unused-vars
  const sendErrorRequestSchema = {
    '$schema': 'http://json-schema.org/draft-07/schema#',
    '$id': 'http://10.20.1.155:3000/senderrorrequest.schema.json',
    'title': 'Send error request',
    'description': 'Contains the response of sendError method',
    'type': 'object',
    'properties': {
      'v': {
        'description': 'FreeFall API version',
        'type': 'string',
      },
      'msg': {
        'description': 'Message with information about the error',
        'type': 'string',
      },
      'trace': {
        'description': 'Array of trace messages',
        'type': 'array',
        'items': {
          'type': 'string',
        },
      },
    },
  };
  return ajv.compile(sendErrorRequestSchema);
}

function getValidateSendErrorRes () { // eslint-disable-line no-unused-vars
  const sendErrorResponseSchema = {
    '$schema': 'http://json-schema.org/draft-07/schema#',
    '$id': 'http://10.20.1.155:3000/senderrorresponse.schema.json',
    'title': 'Send error response',
    'description': 'Contains the response of sendError method',
    'type': 'object',
    'properties': {
      'status_code': {
        'description': 'Indicator for the result of the request',
        'type': ['string', 'number'],
      },
    },
  };
  return ajv.compile(sendErrorResponseSchema);
}
