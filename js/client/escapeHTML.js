var escapeHTML = (function () {
    'use strict';
    var chr = { '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' };
    return function (text) {
        return text.replace(/[\"&<>]/g, function (a) { return chr[a]; });
    };
}());
