module.exports = {
    addTrailingZeros: function(number) {
        return parseFloat(Math.round(number * 100) / 100).toFixed(2);
    },
        generateId: function() {
        var S4 = function() {
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        };
        return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
    },
    validateEmail: function (email) {
        var reg = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return reg.test(String(email).toLowerCase());
    },
    validateName: function(name) {
        var reg = /^([a-zа-я]{3,20})$/;
        return reg.test(String(name).toLowerCase());
    },
    validatePass: function(pass) {
        var reg = /^(\w{6,})$/;
        return reg.test(String(pass).toLowerCase());
    },
    getDate: function() {
        var today = new Date();
        var dd = today.getDate();
        var mm = today.getMonth() + 1; //January is 0!
        var yyyy = today.getFullYear();

        if (dd < 10) {
            dd = '0' + dd
        }

        if (mm < 10) {
            mm = '0' + mm
        }

        today = dd + '-' + mm + '-' + yyyy;
        return today;
    },
    fixText: function(text) {
        if (text == null) {
            return '';
        }
        let splitText = text.split(/[\s,-]+/);
        let newText = "";
        let counter = 0;
        splitText.forEach((word) => {
            if (counter == splitText.length) {
                return newText;
            }
            counter++;
            if (!word.length > 25) {
                newText += word.substring(20) + '... ';
            } else {
                newText += word + ' ';
            }
        });
    },
    isNumber: function(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    },
    contains: function(a, obj) {
    for (var i = 0; i < a.length; i++) {
        if (a[i] === obj) {
            return true;
        }
    }
    return false;
    },
    //utf8 to 1251 converter (1 byte format)
    utf8_decode: function(utf8String) {
        var result = '', c = 0;
        for (var i = 0; i < utf8String.length; i++) {
            c = utf8String.charCodeAt(i);
            if (c > 127) {
                if (c > 1024) {
                    if (c == 1025) {
                        c = 1016;
                    } else if (c == 1105) {
                        c = 1032;
                    }
                    result += String.fromCharCode(c - 848);
                }
            } else {
                result += utf8String.charAt(i);
            }
        }
        return result;
    }
}
