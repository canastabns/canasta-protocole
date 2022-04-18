const Promise = require('bluebird'),
  { promisify } = require('util');

const snapshot = async () => {
    const snapshotData = await promisify(web3.currentProvider.send.bind(web3.currentProvider))({
        jsonrpc: '2.0',
        method: 'evm_snapshot',
        id: new Date().getTime(),
    });

    return {
        restore: async function () {
            await promisify(web3.currentProvider.send.bind(web3.currentProvider))({
                jsonrpc: '2.0',
                method: 'evm_revert',
                params: [snapshotData.result],
                id: new Date().getTime(),
            });
        }
    }
};


const advanceTime = async (delay) => {
    await promisify(web3.currentProvider.send.bind(web3.currentProvider))({
        jsonrpc: "2.0",
        "method": "evm_increaseTime",
        params: [delay]
    });

    await promisify(web3.currentProvider.send.bind(web3.currentProvider))({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: new Date().getTime(),
    });
}

const mine = Promise.promisify(function (done) {
    web3.currentProvider.send({
        jsonrpc: "2.0",
        "method": "evm_mine",
    }, done)
});


module.exports = {
    advanceTime,
    mine,
    snapshot
}

