var events = require('events')
  , childProcess = require('child_process')
  ;

var createSpawner = module.exports = function(options) {

  var self = new events.EventEmitter()
    , lp
    , lpArguments = options.args || [];

  if (options.destination) {
    lpArguments.push('-d' + options.destination);
  }

  if (options.host) {
    var host = [options.host, options.port].filter(Boolean).join(':');

    lpArguments.push('-h' + host);
  }

  if (options.username) {
    lpArguments.push('-U' + options.username);
  }

  if (options.encryption) {
    lpArguments.push('-E');
  }

  function listen(lp, cb) {
    var err = []
      , dat = [];

    lp.stdout.on('data', function(data) {
      dat.push(data.toString());
    });

    lp.stderr.on('data', function(data) {
      err.push(data.toString());
    });

    lp.on('exit', function(code) {
      if(code === 0) {
        return cb && cb(null, dat.join(''));
      }

      return cb && cb (new Error(err.join('')));
    });
  }

  self.withData = function(data, cb) {
    lp = childProcess.spawn('lp'
      , lpArguments
      );
    listen(lp, cb);
    lp.stdin.write(data);
    lp.stdin.end();
  };

  self.withFile = function(file, cb) {
    lpArguments.push('--'); // used to allow filenames starting with a dash (-)
    lpArguments.push(file);
    lp = childProcess.spawn('lp'
      , lpArguments
      );
    listen(lp, cb);
  };

  return self;
};
