// Get enviroment in the .env
require('dotenv').config();

const Chain = require('../middleware/Chain');


describe('API', () => {
    describe('/getChain', () => {
        it('Should return a chain with only the genesis block', () => {
            const req = {}
            Chain.getChain(req, {}, () => {
                const chain = req.responseValue.chain;
                console.log(chain)
            })
        })
    })
    describe('/mine', () => {
        it('Should mine a new block to add into the chain', () => {
            const req = {}
            Chain.mine(req, {}, () => {
                Chain.getChain(req, {}, () => {
                    const chain = req.responseValue.chain;
                    console.log(chain)
                })
            })
        })
    })
    describe('/transaction/new', () => {
        it('Should add the new transaction to the next mining', () => {
            const req = {
                body: {
                    sender: 'sender1',
                    recipient: 'sender2',
                    amount: 1
                }
            }
            Chain.newTransaction(req, {}, () => {
                Chain.mine(req, {}, () => {
                    Chain.getChain(req, {}, () => {
                        const chain = req.responseValue.chain;
                        const transactions = chain.slice(-1)[0].transactions;
                        console.log(chain)
                    })
                })
            })
        })
    })
})
