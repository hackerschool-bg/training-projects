const fs = require('fs');

function trace (msg) {
  fs.appendFile('./src/server/logs/trace.log', `${msg}\n`, (err) => {
  	if (err) console.error(`Error while tracing: ${err.message}`);
  });
}

function clearTraceLog (msg) {
  fs.writeFile('./src/debug/trace.log', '', (err) => {
  	if (err) console.error(`Error while tracing: ${err.message}`);
  });
}

module.exports = { trace, clearTraceLog };
