import BlockChain from "./services/blockChain";

const blockChain = new BlockChain();

// Adiciona novos 100 blocos
for (let i = 0; i < 100; i++) {
  blockChain.newBlock();
}

console.log(blockChain.Chain);