'use strict';

const fs = require('fs');
const Ajv = require('ajv');
let CONFIG;

if (!process.env.CONFIG) {
  console.error('ERROR: expected env CONFIG'); // eslint-disable-line no-console
  process.exit(1);
}

try {
  const configFileContent = fs.readFileSync(process.env.CONFIG, {
    encoding: 'utf-8',
  });

  CONFIG = JSON.parse(configFileContent);

  const configSchemaPath = './config_schema.json';
  const configFileSchemaContent = fs.readFileSync(configSchemaPath, {
    encoding: 'utf-8',
  });

  const configFileSchemaParsed = JSON.parse(configFileSchemaContent);

  const ajv = new Ajv();
  const valid = ajv.validate(configFileSchemaParsed, CONFIG);

  if (!valid) {
    throw new Error(ajv.errorsText());
  }
} catch (error) {
  console.error('ERROR initalizing config:'); // eslint-disable-line no-console
  console.error(error); // eslint-disable-line no-console
  process.exit(1);
}

module.exports = {
  CONFIG: Object.freeze(CONFIG),
};
