node-printer-lp-complete
===============

A tool to print document or data. Based on "lp" binary.

Supports complete set of lp options (http://unixhelp.ed.ac.uk/CGI/man-cgi?lp)

Based on Thomas Tourlourat armetiz/node-printer-lp, live long and prosper.

## Quick Examples

```js
var printer = require ("printer-lp");
var options = {
    media: 'Custom.200x600mm', // Custom paper size
    destination: "EPSON_SX510", // The printer name
    n: 3 // Number of copies
};

var text = "print text directly, when needed: e.g. barcode printers";
var file = "package.json";

var jobText = printer.printText(text, options, "text_demo");
var jobFile = printer.printFile(file, options, "file_demo");

var onJobEnd = function () {
    console.log(this.identifier + ", job send to printer queue");
};

var onJobError = function (message) {
    console.log(this.identifier + ", error: " + message);
};

jobText.on("end", onJobEnd);
jobText.on("error", onJobError);

jobFile.on("end", onJobEnd);
jobFile.on("error", onJobError);
```
