const Block = require('./Block');
const Common = require('./Common');
// const P2P = require('./P2P');
const crypto = require('crypto');

class BlockChain {
    constructor(scope) {
        this.transactions = [];
        this.chain = [];
        this.library = scope;
        // this.p2p = new P2P(this);
        this.getGenesisBlock();
    }

    getChain() {
        this.library.dbLite.query("SELECT * FROM blocks", function (err, res) {
            console.log(err, 123)
            console.log(res)
        });
    }

    /**
     * 获取创始区块
     */
    getGenesisBlock() {
        const block = new Block(this.chain.length + 1, 100, 1, this.transactions);
        this.transactions = [];
        this.chain.push(block);
    }

    /**
     * 获取末尾的区块
     * @returns {*}
     */
    lastBlock() {
        return this.chain.slice(-1)[0];
    }

    /**
     * 创建新交易
     * @param sender {String} 发送方
     * @param recipient {String} 接收方
     * @param amount {Number} 金额
     * @returns {*}
     */
    newTransaction(sender, recipient, amount) {
        this.transactions.push({
            sender: sender,
            recipient: recipient,
            amount: amount
        });
        return this.lastBlock()['index'] + 1;
    }

    /**
     * 挖矿
     */
    mine() {
        const lastBlock = this.lastBlock();
        const lastProof = lastBlock.proof;
        const proof = this.proofOfWork(lastProof);
        this.newTransaction('0', process.env.NODE_NAME, 1);
        const previousHash = Common.calculateHash(lastProof);
        const block = new Block(this.chain.length + 1, proof, previousHash, this.transactions);
        if (Common.isValidNewBlock(block, lastBlock)) {
            this.transactions = [];
            this.chain.push(block);
        }
    }

    /**
     * 给出之前的POW和ap编号检查问题的解决方案是否正确
     * @param lastProof
     * @param proof
     * @returns {boolean}
     */
    validProof(lastProof, proof) {
        const guessHash = crypto.createHmac(process.env.HASH_TYPE, process.env.CRYPTO_SECRET)
            .update(`${lastProof}${proof}`)
            .digest('hex');
        return guessHash.substr(0, 5) === process.env.RESOLUTION_HASH;
    }

    /**
     * 循环直到找到解决方案
     * @param lastProof
     * @returns {number}
     */
    proofOfWork(lastProof) {
        let proof = 0;
        while (true) {
            if (!this.validProof(lastProof, proof)) {
                proof++
            } else {
                break
            }
        }
        return proof;
    }

    /**
     * 用于共识的时候，更新链时调用
     * @param newChain {Array} 新的链
     */
    replaceChain(newChain) {
        this.chain = newChain;
    }
}

module.exports = BlockChain;
