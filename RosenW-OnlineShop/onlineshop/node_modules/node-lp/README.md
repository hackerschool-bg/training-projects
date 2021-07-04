# node-lp

node-lp is an adapter to the unix 'lp(1)' command allowing files to be submitted for printing or altering a pending job. This will only work on Linux at the moment however if anyone wants a windows port then that might happen.

## Requirements

You need `cups` installed to use this module.

## Installation

node-lp can then be installed via NPM

```sh
npm install node-lp
```

Then, require the module

```js
var lp = require("node-lp");
var options = {};

printer = lp(options);

printer.queue ("/tmp/test-file.pdf");
```

## Usage

```js
lp.queue(fileLocation, callback)

lp.queue(buffer, callback)

lp.stop(jobid)

lp.resume(jobid)

lp.hold(jobid)
```

## Licence

Licensed under the [New BSD License](http://opensource.org/licenses/bsd-license.php)
