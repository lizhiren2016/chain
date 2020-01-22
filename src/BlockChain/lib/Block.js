/**
 * 区块类
 */

class Block {
    constructor(index, proof, previousHash, transactions) {
        this.index = index;   // 本区块块号，区块号从0号开始算起
        this.transactions = transactions; // 交易列表
        this.timestamp = new Date(); // 创建的日期时间
        this.proof = proof; // 区块的Hash值
        this.previousHash = previousHash; // 上一个区块的Hash值
    }
}

module.exports = Block;
