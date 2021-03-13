import stringify from "json-stable-stringify";
import { createHash } from "crypto"

export interface IBlock {
  index: number,
  timestamp: number,
  previousHash: string,
}

export default class BlockChain {

  chain: IBlock[] = [];

  public get Chain(): IBlock[] {
    return this.chain;
  }

  /**
   * Gera o hash em SHA-256 de um bloco
   * @param block Bloco que será criptografado
   */
  private hashBlock(block: IBlock) {
    //  Usamos a lib `json-stable-stringify` para gerar um json deterministico, isso evita incosistencia de hashes
    const blockString = stringify(block) || "";

    const hash = createHash("sha256")
      .update(blockString)
      .digest("hex")

    return hash;
  }

  private lastBlock() {
    return this.chain[this.chain.length - 1];
  }

  private lastBlockHash() {
    return this.hashBlock(this.lastBlock());
  }

  /** 
   * Cria um novo bloco e adiciona ao chain
   */
  public newBlock(previousHash?: string): IBlock {

    const currentDate = new Date();

    const block: IBlock = {
      index: this.chain.length + 1,
      timestamp: currentDate.getTime(),
      previousHash: previousHash || this.lastBlockHash()
    }

    this.chain.push(block);
    return block;
  }
}