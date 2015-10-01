var async = require('async');
var VM = require('ethereumjs-vm');
var Account = require('ethereumjs-account');
var Transaction = require('ethereumjs-tx');
var Trie = require('merkle-patricia-tree');
var SHA3Hash = require('sha3').SHA3Hash;

var account1 = {
  address: new Buffer('cd2a3d9f938e13cd947ec05abc7fe734df8dd826', 'hex'),
  key: new Buffer(sha3('cow'), 'hex')
};

/*
contract Contract2 {
    uint i;
    function Contract2() {
        i = 1;
    }
}
*/
var account2 = {
  address: new Buffer('985509582b2c38010bfaa3c8d2be60022d3d00da', 'hex'),
  code: new Buffer('60606040525b60016000600050819055505b600a80601e6000396000f30060606040526008565b00', 'hex')
};


/*
contract Contract {
    function test(uint i) returns (uint) {
        return i;
    }
}
*/
var account3 = {
  code: new Buffer('6060604052606a8060116000396000f30060606040526000357c01000000000000000000000000000000000000000000000000000000009004806329e99f07146037576035565b005b6046600480359060200150605c565b6040518082815260200191505060405180910390f35b60008190506065565b91905056', 'hex')
}

var vm = new VM(new Trie());

async.series([
  createAccount,
  runCode,
  runTx,
  printAccounts
], function(err) {
  if (err) console.error(err);
});

function createAccount(cb) {
  var account = new Account();
  account.balance = 'f00000000000000001';
  vm.trie.put(new Buffer(account1.address, 'hex'), account.serialize(), cb);
}

function runCode(cb) {
  var account = new Account();
  
  vm.runCode({
    code: account2.code,
    data: account2.code,
    account: account,
    gasLimit: 3141592,
    address: account2.address,
    caller: account1.address
  }, function(err, result) {
    if (err) return cb(err);
    account.setCode(vm.trie, result.return, function(err) {
      if (err) cb(err);
      else vm.trie.put(account2.address, account.serialize(), cb);
    });
  });
}

function runTx(cb) {
  var tx = new Transaction({
    gasLimit: 3141592,
    gasPrice: 1,
    data: account3.code
  });
  tx.sign(account1.key);
  vm.runTx({ tx: tx }, cb);
}

function printAccounts(cb) {
  var stream = vm.trie.createReadStream();
  stream.on('data', function(data) {
    new Account(data.value).getCode(vm.trie, function(err, code) {
      if (err) console.error(err);
      else console.log(data.key.toString('hex') + ': ' + code.toString('hex'));
    });
  });
  stream.on('end', cb);
}

function sha3(str) {
  var sha = new SHA3Hash(256);
  sha.update(str);
  return sha.digest('hex');
}
