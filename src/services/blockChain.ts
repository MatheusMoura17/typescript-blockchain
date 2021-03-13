import stringify from "json-stable-stringify";
import { createHash } from "crypto"
import axios from "axios";

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
  nodes: Set<string> = new Set<string>()
  chain: IBlock[] = [];
  currentTransactions: ITransaction[] = []

  constructor() {
    this.nodes = new Set<string>();
    this.currentTransactions = [];
    this.chain = [];
    // Cria o bloco genesis
    this.newBlock("1", 100);
  }

  public get Chain(): IBlock[] {
    return this.chain;
  }

  public get Nodes(): Set<string> {
    return this.nodes;
  }

  private hashString(content: string): string {
    return createHash("sha256").update(content).digest("hex");
  }

  /**
   * Gera o hash em SHA-256 de um bloco
   * @param block Bloco que será criptografado
   */
  private hashBlock(block: IBlock): string {
    //  Usamos a lib `json-stable-stringify` para gerar um json deterministico, isso evita incosistencia de hashes
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

  /**
   * Limpa as transações atuais
   */
  private clearCurrentTransactions() {
    this.currentTransactions = []
  }

  /**
   * Algoritimo de prova de trabalho.
   * Busca pelo numero x, onde o sha256(x * y) contenha 4 zeros a esquerda.
   * x = O número que queremos (nossa prova de trebalho PoW)
   * y = Ultima prova de trabalho calculada  
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
   * Checa se uma prova (proof) é valida, checando se o hash contém 4 zeros a esquerda
   * @param lastProof Ultima prova
   * @param proof Prova atual
   */
  private isValidProof(lastProof: number, proof: number): boolean {
    const guess = `${lastProof}${proof}`;
    const guessHash = this.hashString(guess.toString());
    return guessHash.substr(0, 4) === "0000";
  }

  /**
   * Checa se um determinado chain é válido
   * @param chain 
   */
  public isValidChain(targetChain: IBlock[]) {

    let lastBlock = targetChain[0];
    let currentIndex = 1;

    const chainLength = targetChain.length;

    while (currentIndex < chainLength) {
      const block = targetChain[currentIndex];

      // Checa se o hash do bloco está diferente
      if (block.previousHash !== this.hashBlock(lastBlock)) {
        console.log("chain invalido por causa do hash")
        return false;
      }

      // Checa se a prova de trabalho (proof) está é invalida
      if (!this.isValidProof(lastBlock.proof, block.proof)) {
        console.log("chain invalido poor causa do proof")
        return false;
      }

      lastBlock = block;
      currentIndex += 1;
    }

    return true;
  }

  private async requestNodeChain(nodeAddress): Promise<INodeChainResult> {
    const response = await axios.get(`${nodeAddress}/chain`);

    const result: INodeChainResult = {};

    if (response.status == 200) {
      result.chain = response.data.chain as IBlock[],
        result.length = response.data.length as number
    }

    return result;
  }

  private async requestAllNodesChain(): Promise<INodeChainResult[]> {
    return Promise.all([...this.nodes].map(this.requestNodeChain))
  }

  public async resolveConflicts(): Promise<boolean> {

    let maxLength = this.chain.length;
    const nodeContents = await this.requestAllNodesChain();

    const newChain = nodeContents.reduce<IBlock[] | null>((prev, { chain, length }) => {
      if (chain && length) {

        if (length > maxLength && this.isValidChain(chain)) {
          maxLength = length;
          return chain;
        }

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
   * Registra um novo node no blockchain
   * @param address endereço deste blockchain
   */
  public registerNode(address) {
    this.nodes.add(address);
    console.log(`Novo node adicionado: ${address}`);
  }

  /**
   * Cria uma nova transação
   * @param sender Quem está enviando
   * @param recipient Quem receberá
   * @param amount quantidade
   */
  public newTransaction(sender: string, recipient: string, amount: number): number {
    const transaction: ITransaction = {
      sender,
      recipient,
      amount
    }

    this.currentTransactions.push(transaction);

    console.log("Nova transação adicionada");
    console.log(transaction);

    // retorna o indice do bloco que terá a transação
    return this.chain.length + 1
  }

  /** 
   * Cria um novo bloco e adiciona ao chain
   */
  public newBlock(previousHash: string, proof: number): IBlock {

    const currentDate = new Date();

    const block: IBlock = {
      proof,
      transactions: this.currentTransactions,
      index: this.chain.length + 1,
      timestamp: currentDate.getTime(),
      previousHash: previousHash || this.lastBlockHash()
    }

    this.clearCurrentTransactions();

    this.chain.push(block);
    console.log("Novo bloco adicionado");
    console.log(block);
    return block;
  }
}