const crypto = require('crypto');

class Common {
    /**
     * 获取hash
     * @param block
     * @returns {PromiseLike<ArrayBuffer>}
     */
    calculateHash (block) {
        const blockString = JSON.stringify(block);
        const hash = crypto.createHmac(process.env.HASH_TYPE, process.env.CRYPTO_SECRET)
            .update(blockString)
            .digest('hex');
        return hash
    }

    /**
     * 校验新区块的有效性
     * @param newBlock {Object} 新区块
     * @param previousBlock {Object} 上一个区块
     * @returns {boolean}
     */
    isValidNewBlock(newBlock, previousBlock) {
        const lastProof = previousBlock.proof;
        if (previousBlock.index + 1 !== newBlock.index) {
            console.log('invalid index');
            return false;
        } else if (this.calculateHash(lastProof) !== newBlock.previousHash) {
            console.log('invalid previoushash');
            return false;
        }
        return true;
    }
}

module.exports = new Common();
