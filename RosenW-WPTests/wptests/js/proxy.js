document.getElementsByTagName('head')[0].innerHTML = '';
document.getElementById('test-container').removeChild(document.getElementsByTagName('base')[0]);

// if (!OPNET_ARXS) {
//     var OPNET_ARXS = {
//         startJS: Number(new Date()),
//         clientId: 'A51690151BB3D518',
//         appId: 1317404,
//         collector: 'eue.collect-opnet.com',
//         sv: '0302'
//     };
//     (function() {
//         var w = window,
//             l = w.addEventListener,
//             m = w.attachEvent,
//             d = document,
//             s = 'script',
//             t = 'load',
//             o = OPNET_ARXS,
//             z = '-0b2c4d73f58414c86c7384150be8ca44',
//             r = (('https:' === d.location.protocol) ?
//                 'https://953c27ce3b34cfb8cc56' + z + '.ssl' :
//                 'http://fb3f316d487bcc59f7ec' + z + '.r88') +
//             '.cf1.rackcdn.com/opnet_browsermetrix.c.' +
//             (o.ajax ? 'ajax.js' : 'js'),
//             p = ('onpagehide' in w),
//             e = p ? 'pageshow' : t,
//             j = d.createElement(s),
//             x = d.getElementsByTagName(s)[0],
//             h = function(y) {
//                 o.ldJS = new Date();
//                 o.per = y ? y.persisted : null;
//             },
//             i = function() {
//                 o.ld = 1;
//             };
//         o.cookie = d.cookie;
//         d.cookie =
//             '_op_aixPageId=0; path=/; expires=' + (new Date(0)).toGMTString();
//         o.cookieAfterDelete = d.cookie;
//         j.async = 1;
//         j.src = r;
//         if (l) {
//             l(e, h, false);
//             if (p) {
//                 l(t, i, false);
//             }
//         } else if (m) {
//             m('on' + e, h);
//             if (p) {
//                 m('on' + t, i);
//             }
//         }
//         if (o.sync) {
//             d.write('<' + s + ' src=\'' + r + '\'></' + s + '>');
//         } else {
//             x.parentNode.insertBefore(j, x);
//         }
//     })();
// }


//opEueMonUID=u_mh5cblew3eojn4a36qq; JSESSIONID=C8163766C459D6E8025240EAE59EE6BA; _op_jsTiming=1543501020185%7Chttp%3A%2F%2Fwww.123assess.com%2Fevent%2Fdispatch