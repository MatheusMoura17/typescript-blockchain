import express from "express";
import uuid4 from "uuid4"

import BlockChain from "./services/blockChain";

const blockChain = new BlockChain();

const serverNodeIdentifier = uuid4().replace(/-/g, "");
const serverPort = 4000;

const app = express();

// Parsers do express
app.use(express.urlencoded());
app.use(express.json());

app.get("/", (_, res) => {
  res.send("ok!");
})

app.get("/mine", (_, res) => {
  const proof = blockChain.proofOfWork();

  // Recompensa do minerador
  // o sender é 0 para identificar que a moeda foi minerada
  blockChain.newTransaction("0", serverNodeIdentifier, 1);

  const forjedBlock = blockChain.newBlock(blockChain.lastBlockHash(), proof);

  res.send({
    message: "Novo bloco forjado!",
    ...forjedBlock
  });
});

app.post("/transaction/new", (req, res) => {
  const { sender, recipient, amount } = req.body;

  if (!sender || !recipient || !amount) {
    return res.status(400).send("Parametros insuficientes, campos obrigatórios: sender | recipient | amount")
  }

  const transactionIndex = blockChain.newTransaction(sender, recipient, amount);

  res.send(`A transação será adicionada no bloco ${transactionIndex}`)
});

app.get("/chain", (_, res) => {
  res.send({
    chain: blockChain.Chain,
    length: blockChain.Chain.length
  });
});

app.post("/nodes/register", (req, res) => {
  const { nodes } = req.body;

  if (!nodes) {
    return res.status(400).send("Parametros insuficientes, campos obrigatórios: nodes, separados por virgula. ex.: http://node1.com,http://node2.com")
  }

  const nodeAddresses: string[] = nodes.split(",");

  nodeAddresses.forEach(nodeAddress => blockChain.registerNode(nodeAddress));

  res.send({
    message: "Node adicionado!",
    nodes: [...blockChain.Nodes]
  });
});

app.get("/resolve", async (_, res) => {
  const isReplaced = await blockChain.resolveConflicts();

  const message = isReplaced ? "Seu chain foi alterado" : "Seu chain é autoritário!";

  console.log(`/resolve: ${message}`);

  res.send({
    message,
    currentChain: blockChain.Chain,
  });
});

app.listen(serverPort);

console.log(`Servidor iniciado na porta ${serverPort}`);
console.log(`UID do node: ${serverNodeIdentifier}`);