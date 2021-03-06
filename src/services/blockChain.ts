import stringify from "json-stable-stringify";
import { createHash } from "crypto"

export interface IBlock {
  index: number,
  timestamp: number,
  transactions: ITransaction[]
  previousHash: string,
  proof: number
}

export interface ITransaction {
  sender: string,
  recipient: string,
  amount: number
}

export interface INodeChainResult {
  chain?: IBlock[],
  length?: number,
}

export default class BlockChain {
  private chain: IBlock[] = [];
  private currentTransactions: ITransaction[] = []

  constructor() {
    // Adds block genesis to chain
    this.newBlock("1", 100);
  }

  public get Chain(): IBlock[] {
    return this.chain;
  }

  private hashString(content: string): string {
    return createHash("sha256").update(content).digest("hex");
  }

  /**
   * Generates a SHA-256 block hash
   * @param block Block to be hashed
   */
  private hashBlock(block: IBlock): string {
    // Use `json-stable-stringify` library to generate a deterministic JSON, prevents hash inconsistency because object keys sorting.
    const blockString = stringify(block);

    const hash = this.hashString(blockString);

    return hash;
  }

  private lastBlock() {
    return this.chain[this.chain.length - 1];
  }

  public lastBlockHash() {
    return this.hashBlock(this.lastBlock());
  }

  private clearCurrentTransactions() {
    this.currentTransactions = []
  }

  // TODO - This implementation is failing at times
  /**
   * Algorithm to find PoW (Proof of work)
   * Search by number x, in sha256(x * y), starts with 4 zeros to left, sample.: 0000xe6....
   * You can change the complexity changing number of zeros to up.
   * x = Number returned by method
   * y = Proof of last block in chain
   * @param lastProof 
   */
  public proofOfWork() {
    let proof = 0;

    const last_block = this.lastBlock();
    const last_proof = last_block.proof;

    console.log(`Calculando PoW de ${last_proof}`);

    while (!this.isValidProof(last_proof, proof)) {
      proof += 1;
    }
    console.log(`PoW de ${last_proof} encontrado: ${proof}`);
    return proof;
  }


  /**
   * Check if proof is valid.
   * Basically checks if the hash contains 4 zeros to the left
   */
  private isValidProof(lastProof: number, proof: number): boolean {
    const guess = lastProof * proof;
    const guessHash = this.hashString(guess.toString());
    return guessHash.substr(0, 4) === "0000";
  }

  /**
   * Check if PoW and Hash of all blocks are valid
   * @param chain Chain to be analyzed
   */
  public isValidChain(chain: IBlock[]) {

    let lastBlock = chain[0];
    let currentIndex = 1;

    const chainLength = chain.length;

    while (currentIndex < chainLength) {
      const block = chain[currentIndex];

      // Checks if hash of block is invalid
      if (block.previousHash !== this.hashBlock(lastBlock)) return false;

      // Checks if PoW is invalid
      if (!this.isValidProof(lastBlock.proof, block.proof)) return false;

      lastBlock = block;
      currentIndex += 1;
    }

    return true;
  }

  /**
   * Resolves conflict from array of chain passed as param 
   **/
  public resolveConflictsMany(chains: IBlock[][]): boolean {

    let maxLength = this.chain.length;

    const newChain = chains.reduce<IBlock[]>((prev, chain) => {

      const chainLength = chain.length;

      if (chainLength > maxLength && this.isValidChain(chain)) {
        maxLength = chainLength;
        return chain;
      }

      return prev;
    }, null)

    if (newChain) {
      this.chain = newChain;
      return true;
    }

    return false;
  }

  /**
   * Resolves conflict from chain passed as param 
   * @param chain 
   * @returns 
   */
  public resolveConflicts(chain: IBlock[]): boolean {
    const canReplaceChain = chain.length > this.chain.length && this.isValidChain(chain);

    if (canReplaceChain) this.chain = chain;

    return canReplaceChain;
  }

  /**
   * Add new transaction request, transactions are automatically attached in new block discovered by miners.
   * @param sender Address of sender >>
   * @param recipient Address of receiver <<
   * @param amount Amount of money to transfer
   */
  public newTransaction(transaction: ITransaction): number {

    this.currentTransactions.push(transaction);

    console.log("Blockchain: New transaction added");
    console.log(transaction);

    return this.chain.length + 1
  }

  /** 
   * Add new block to chain
   * @param previousHash Last block hash, 
   * @param proof PoW (proof of work) of this block
   */
  public newBlock(previousHash: string, proof: number): IBlock {

    const currentDate = new Date();

    const block: IBlock = {
      proof,
      transactions: this.currentTransactions,
      index: this.chain.length + 1,
      timestamp: currentDate.getTime(),
      previousHash: previousHash || this.lastBlockHash(),
    }

    this.clearCurrentTransactions();

    this.chain.push(block);
    console.log("BlockChain: New block added");
    return block;
  }
}