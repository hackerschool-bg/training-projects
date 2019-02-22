'use strict';

const fs = require('fs');
const path = require('path');
const { CONFIG } = require('./config.js');
const {
  log,
  errorLogLevels: {
    ERROR,
    DEBUG,
  },
} = require('./logger.js');
const {
  parseReqMeta,
  buildResMeta,
} = require('./http_msg_formatter.js');
const { assert, isObject } = require('./web_server_utils.js');

const clientConnStates = Object.freeze({
  ESTABLISHED: 1,
  RECEIVING: 2,
  SENDING: 3,
  CLOSED: 4,
});

const clientConnection = (clientConnections, id, socket) => {
  const connData = {
    id,
    socket,
    state: clientConnStates.ESTABLISHED,
    reqMetaRaw: '',
    reqMeta: {},
    resMeta: {},
  };

  socket.setTimeout(CONFIG.socket_timeout);
  socket.setEncoding('utf-8');

  socket.on('data', (data) => {
    log.error(DEBUG, { msg: `${connData.id.toString()}: data received`, var_name: 'data', var_value: data });

    if (connData.state === clientConnStates.ESTABLISHED) {
      connData.state = clientConnStates.RECEIVING;
    }

    if (connData.state === clientConnStates.RECEIVING) {
      connData.reqMetaRaw += data;

      const reqMetaEnd = connData.reqMetaRaw.indexOf('\r\n\r\n');

      if (reqMetaEnd >= 0) {
        log.error(DEBUG, { msg: 'reached end of request meta' });

        // ignoring body, if any
        connData.reqMetaRaw = connData.reqMetaRaw.substring(0, reqMetaEnd);

        try {
          connData.reqMeta = parseReqMeta(connData.reqMetaRaw);
        } catch (error) {
          const isFinalSend = true;
          log.error(DEBUG, { msg: `${connData.id.toString()}: ${error}` });
          sendMeta(400, {}, isFinalSend);
          return;
        }

        serveStaticFile(path.join(
          CONFIG.web_server_root,
          CONFIG.document_root,
          connData.reqMeta.path
        ));
      } else if (connData.reqMetaRaw.length > CONFIG.req_meta_limit) {
        const isFinalSend = true;
        sendMeta(400, {}, isFinalSend);
      }
    } else {
      // if state is SENDING or CLOSED, drop data
      log.error(DEBUG, { msg: `${connData.id.toString()}: data received while in SENDING or CLOSED state` });
    }
  });

  socket.on('timeout', () => {
    log.error(DEBUG, { msg: `${connData.id.toString()}: timeout` });
    socket.destroy();
  });

  socket.on('end', () => {
    // socket will automatically send FIN back, because allowHalfOpen is set to false
    log.error(DEBUG, { msg: `${connData.id.toString()}: FIN sent by other side` });
  });

  socket.on('error', (error) => {
    // socket will automatically close
    log.error(ERROR, { msg: `${connData.id.toString()}: socket error`, var_name: 'error', var_value: error });
  });

  socket.on('close', (hadError) => {
    log.error(DEBUG, { msg: `${connData.id.toString()}: close`, var_name: 'hadError', var_value: hadError });
    clientConnections.delete(id);
  });

  const serveStaticFile = (filePath) => {
    const responseHeaders = Object.create(null);

    fs.stat(filePath, (err, stats) => {
      if (err) {
        log.error(DEBUG, { msg: `${connData.id.toString()} stat error:`, var_name: 'error', var_value: err });
        const isFinalSend = true;
        sendMeta(400, {}, isFinalSend);
        return;
      }

      responseHeaders['Content-Length'] = stats.size.toString();

      sendMeta(200, responseHeaders);

      // TODO can it throw?
      const readStream = fs.createReadStream(filePath, {
        flags: 'r',
      });

      readStream.on('close', () => {
        log.error(DEBUG, { msg: `${connData.id.toString()}: readStream closed` });
      });

      readStream.on('data', (data) => {
        const canWriteMore = socket.write(data, () => {
          log.error(DEBUG, { msg: `${connData.id.toString()}: data sent to socket`, var_name: 'data.length', var_value: data.length });
        });

        if (!canWriteMore) {
          log.error(DEBUG, { msg: `${connData.id.toString()}: socket send buffer filled` });
          readStream.pause();
        }
      });

      readStream.on('end', () => {
        log.error(DEBUG, { msg: `${connData.id.toString()}: all data from readStream consumed` });
        socket.removeAllListeners('drain');
        socket.end();
      });

      readStream.on('error', (error) => {
        log.error(ERROR, { var_name: 'error', var_value: error, msg: `${connData.id.toString()}: readStream error` });
        // TODO sent error to client in some cases
      });

      socket.on('drain', () => {
        log.error(DEBUG, { msg: `${connData.id.toString()} socket send buffer drained` });
        readStream.resume();
      });
    });
  };

  const sendMeta = (statusCode, headers, isFinalSend = false) => {
    assert(Number.isSafeInteger(statusCode));
    assert(isObject(headers));
    assert(typeof isFinalSend === 'boolean');

    connData.state = clientConnStates.SENDING;

    connData.resMeta = {
      statusCode,
      headers,
    };

    const resMetaMsg = buildResMeta(statusCode, headers);

    log.error(DEBUG, { msg: `${connData.id.toString()}: sending meta to socket`, var_name: 'data.length', var_value: resMetaMsg.length });

    if (isFinalSend) {
      socket.end(resMetaMsg, 'utf-8', () => {
        socket.destroy();
      });
    } else {
      socket.write(resMetaMsg, 'utf-8');
    }
  };

  return connData;
};

module.exports = {
  clientConnection,
};
