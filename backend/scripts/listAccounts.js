const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider(process.env.HARDHAT_RPC || 'http://127.0.0.1:8545');
(async()=>{
  try{
    const a = await provider.listAccounts();
    console.log('accounts', a);
  }catch(e){
    console.error('err', e);
  }
})();
