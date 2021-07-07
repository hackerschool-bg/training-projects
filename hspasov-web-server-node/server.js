'use strict';

const { Server } = require('net');
const { CONFIG } = require('./config.js');
const {
  log,
  errorLogLevels: {
    ERROR,
    INFO,
    DEBUG,
  },
} = require('./logger.js');
const { clientConnection } = require('./client_connection.js');
const { idGenerator } = require('./web_server_utils.js');

const start = () => {
  const server = new Server({
    allowHalfOpen: false,
    pauseOnConnect: false,
  });
  const clientConnections = new Map();
  const idGenIt = idGenerator();

  server.on('listening', () => {
    log.error(INFO, { msg: `listening on ${CONFIG.host} ${CONFIG.port}...` });
  });

  server.on('connection', (socket) => {
    log.error(DEBUG, { msg: 'new connection' });
    const id = Symbol(idGenIt.next().value);
    const conn = clientConnection(clientConnections, id, socket);
    clientConnections.set(id, conn);
  });

  server.on('error', (error) => {
    log.error(ERROR, { var_name: 'error', var_val: error, msg: 'server error' });
  });

  server.on('close', () => {
    log.error(ERROR, { msg: 'server shut down' });
  });

  // TODO check IPC and cluster workers
  server.listen({
    port: CONFIG.port,
    host: CONFIG.host,
    backlog: CONFIG.backlog,
  });
};

module.exports = {
  start,
};
