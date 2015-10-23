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
contract Predefined {
    
    function test() {
        
    }
}
*/
var account2 = {
  address: new Buffer('084f6a99003dae6d3906664fdbf43dd09930d0e3', 'hex'),
  code: new Buffer('606060405260478060106000396000f360606040526000357c010000000000000000000000000000000000000000000000000000000090048063f8a8fd6d146037576035565b005b604260048050506044565b005b5b56', 'hex')
};

/*
contract C2 {

    function C2() {
        Predefined(0x084f6a99003dae6d3906664fdbf43dd09930d0e3).test();
    }
}
 */
var tx ={
  data: new Buffer('60606040525b73084f6a99003dae6d3906664fdbf43dd09930d0e373ffffffffffffffffffffffffffffffffffffffff1663f8a8fd6d604051817c01000000000000000000000000000000000000000000000000000000000281526004018090506000604051808303816000876161da5a03f1156002575050505b600a8060866000396000f360606040526008565b00', 'hex')
};

var vm = new VM(new Trie());

async.series([
  createAccount,
  runCode,
  runTx,
  printAccounts
], function(err) {
  if (err) console.error('err: ' + err);
});

function createAccount(cb) {
  var account = new Account();
  account.balance = 'f00000000000000001';
  vm.trie.put(new Buffer(account1.address, 'hex'), account.serialize(), cb);
}

function runCode(cb) {
  vm.runCode({
    code: account2.code,
    data: account2.code,
    gasLimit: 3141592,
    address: account2.address,
    caller: account1.address
  }, function(err, result) {
    if (err) return cb(err);
    vm.trie.get(account2.address, function(err, data) {
      if (err) return cb(err);
      var account = new Account(data);
      account.setCode(vm.trie, result.return, function(err) {
        if (err) cb(err);
        else vm.trie.put(account2.address, account.serialize(), cb);
      });
    });
  });
}

function runTx(cb) {
  var t = new Transaction({
    gasLimit: 3141592,
    gasPrice: 1,
    data: tx.data
  });
  t.sign(account1.key);
  vm.runTx({ tx: t }, cb);
}

function printAccounts(cb) {
  var stream = vm.trie.createReadStream();
  stream.on('data', function(data) {
    var address = data.key;
    var account = new Account(data.value);
    account.getCode(vm.trie, function(err, code) {
      if (err) console.error(err);
      else console.log(address.toString('hex') + ': ' + code.toString('hex'));
    });
  });
  stream.on('end', cb);
}

function sha3(str) {
  var sha = new SHA3Hash(256);
  sha.update(str);
  return sha.digest('hex');
}
