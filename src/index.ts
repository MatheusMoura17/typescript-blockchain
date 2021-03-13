import Pool from "./services/pool";

const pool = new Pool();

const runAsPoolServer = process.argv.length >= 2 ? process.argv[2] : false;

if (runAsPoolServer) {
  pool.listen();
} else {
  pool.connect();
}

// import BlockChain from "./services/blockChain";

// const blockChain = new BlockChain();

// const serverNodeIdentifier = uuid4().replace(/-/g, "");
// const serverPort = 3000;

// const app = express();

// // Parsers of express
// app.use(express.urlencoded());
// app.use(express.json());

// app.get("/", (_, res) => {
//   res.send("ok!");
// })

// app.get("/mine", (_, res) => {
//   const proof = blockChain.proofOfWork();

//   // Miner rewards
//   // Sender is 0 to identify miner coin log
//   blockChain.newTransaction("0", serverNodeIdentifier, 1);

//   const forjedBlock = blockChain.newBlock(blockChain.lastBlockHash(), proof);

//   res.send({
//     message: "New Block forged!!",
//     ...forjedBlock
//   });
// });

// app.post("/transaction/new", (req, res) => {
//   const { sender, recipient, amount } = req.body;

//   if (!sender || !recipient || !amount) {
//     return res.status(400).send("Insuficient params! required: sender | recipient | amount")
//   }

//   const transactionIndex = blockChain.newTransaction(sender, recipient, amount);

//   res.send(`The transaction will be added in ${transactionIndex}`)
// });

// app.get("/chain", (_, res) => {
//   res.send({
//     chain: blockChain.Chain,
//     length: blockChain.Chain.length
//   });
// });

// app.post("/nodes/register", (req, res) => {
//   const { nodes } = req.body;

//   if (!nodes) {
//     return res.status(400).send("Insuficient params!, required: nodes, separed by ','. Sample: 'http://node1.com,http://node2.com'")
//   }

//   const nodeAddresses: string[] = nodes.split(",");

//   nodeAddresses.forEach(nodeAddress => blockChain.registerNode(nodeAddress));

//   res.send({
//     message: "New node added",
//     nodes: [...blockChain.Nodes]
//   });
// });

// app.get("/resolve", async (_, res) => {
//   const isReplaced = await blockChain.resolveConflicts();

//   const message = isReplaced ? "Your chain has ben changed" : "Your chain is autoritative!";

//   console.log(`/resolve: ${message}`);

//   res.send({
//     message,
//     currentChain: blockChain.Chain,
//   });
// });

// app.listen(serverPort);

// console.log(`Server started in port ${serverPort}`);
// console.log(`Server wallet address: ${serverNodeIdentifier}`);