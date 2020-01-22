var genesisblock = null;

// Constructor
function Block(scope, cb) {
    genesisblock = scope.genesisblock;
    cb && setImmediate(cb, null, this);
}

Block.prototype.dbSave = function (block, cb) {
    this.scope.dbLite.query("INSERT INTO blocks(id, timestamp, height, proof, previousHash) VALUES($id, $timestamp, $height, $proof, $previousHash)", {
        id: block.id,
        timestamp: block.timestamp,
        height: block.height,
        proof: block.proof,
        previousHash: block.previousHash,
    }, cb);
};

// Export
module.exports = Block;
