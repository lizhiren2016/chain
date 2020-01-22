// Constructor
function Peer(scope, cb) {
    cb && setImmediate(cb, null, this);
}

Peer.prototype.getRandomNum = function () {
    var range = 1000000000;
    var random = Math.random();
    return Math.round(range * random);
};

// Export
module.exports = Peer;
