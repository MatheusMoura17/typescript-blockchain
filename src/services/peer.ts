import BlockChain, { IBlock, ITransaction } from "./blockChain";
import WebSocketRelay from "./webSocketRelay";
import EventEmitter from "events";

export interface IPeerData {
  command: "setUuid" | "seed" | "propagateChain" | "getChain" | "getChainResponse"
  data?: unknown;
}

export default class Peer extends EventEmitter {
  private wsRelay: WebSocketRelay;
  private uuid = "";
  private blockChain: BlockChain = new BlockChain();
  private neighborsUuids: string[] = [];
  private peersChains: Record<string, IBlock[]> = {};

  constructor(wsRelay: WebSocketRelay) {
    super();
    this.wsRelay = wsRelay;
  }

  /**
   * Send message to target recipient
   * @param recipient uuid target
   */
  public sendMessage(recipient: string, data: IPeerData) {
    this.wsRelay.sendMessage(this.uuid, recipient, data);
  }

  /**
   * Send message to multiple target recipients
   * @param recipients uuids target
   */
  public sendMessageMany(recipients: string[], data: IPeerData) {
    recipients.forEach(recipient => {
      this.sendMessage(recipient, data)
    });
  }

  /**
   * Process init remote procedure call
   * @param uuid received uuid
   */
  private setUuidCommand(uuid: string) {
    this.uuid = uuid;
    console.log(`Peer: Setted UUID: ${uuid}`);
  }

  /**
   * Process remote call of seed, this method refresh current node list
   * @param neighborsUuids 
   */
  private seedCommand(neighborsUuids: string[]) {
    this.neighborsUuids = neighborsUuids;
    console.log(`Peer: Received seed from server`);
    console.log(neighborsUuids);

    // every seed, resolve to garants best version of local chain 
    this.resolve();
  }

  /**
   * Process remote call of propagation
   * @param chain received chain
   */
  private propagateCommand(chain: IBlock[]) {
    console.log(`Peer: Received propagate command`);
    const result = this.blockChain.resolveConflicts(chain);
    const message = result ? "Local chain is changed" : "Local chain is autoritative!"
    console.log(`Peer: Propagate result: ${message}`);
  }

  /**
   * Process remote call of chain requisition seting current chain to requisitor
   */
  private getChainCommand(requisitorUuid: string) {
    // Sent current chain for requisitor
    this.sendMessage(requisitorUuid, {
      command: "getChainResponse",
      data: this.blockChain.Chain
    });
  }

  /**
   * Process remote call in response of chain requisition
   * @param ownerUuid 
   * @param chain 
   */
  private getChainResponseCommand(ownerUuid: string, chain: IBlock[]) {
    this.peersChains[ownerUuid] = chain;

    const current = Object.keys(this.peersChains).length;
    const total = this.neighborsUuids.length;

    const isReceivedAllChains = current == total;

    console.log(`Peer: Received chain to resolve. ${current} of ${total}`);

    if (isReceivedAllChains) {
      const result = this.blockChain.resolveConflictsMany(Object.values(this.peersChains));
      const message = result ? "Local chain changed" : "Local chain is autoritative";
      console.log(`Peer: Chain resolved: "${message}"`);
    }
  }

  /** 
   * Add new transaction in blockchain
   */
  public addTransaction(transaction: ITransaction) {
    console.log("Peer: Adding new transaction");
    this.blockChain.newTransaction(transaction);
  }

  /**
   * Forge next block and reward a coin if sucess
   */
  public startMiner() {
    console.log(`Peer: Minerating...`);
    const proof = this.blockChain.proofOfWork();

    // Miner rewards
    // Sender is 0 to identify miner coin log
    this.blockChain.newTransaction({
      sender: "0",
      recipient: this.uuid,
      amount: 1,
    });

    const forgedBlock = this.blockChain.newBlock(this.blockChain.lastBlockHash(), proof);

    console.log(`Peer: New block forged! ${forgedBlock.proof}`);
    this.propagate();
  }

  /**
   * Send current chain to all peers in current netwoork
   * @returns 
   */
  public propagate() {
    if (this.neighborsUuids.length == 0) return;

    console.log(`Peer: Sending propagate command`);
    this.sendMessageMany(this.neighborsUuids, {
      command: "propagateChain",
      data: this.blockChain.Chain
    });
  }


  /**
   * Request chain of all nodes and valid locally
   */
  public resolve() {
    console.log("Peer: Requesting chains to resolve");
    this.peersChains = {};
    this.sendMessageMany(this.neighborsUuids, {
      command: "getChain",
    })
  }

  public configureLocalPeer() {
    this.wsRelay.on("clientReceiveMessage", (senderUuid: string, message: IPeerData) => {
      switch (message.command) {
        case "setUuid": this.setUuidCommand(message.data as string); break;
        case "seed": this.seedCommand(message.data as string[]); break;
        case "propagateChain": this.propagateCommand(message.data as IBlock[]); break;
        case "getChain": this.getChainCommand(senderUuid); break;
        case "getChainResponse": this.getChainResponseCommand(senderUuid, message.data as IBlock[]); break;
      }
    });
  }

  public configureServerSidePeer(uuid: string) {
    // Initilization
    this.uuid = uuid;

    this.sendMessage(this.uuid, {
      command: "setUuid",
      data: this.uuid,
    });
  }

}