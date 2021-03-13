import BlockChain, { IBlock } from "./blockChain";
import WebSocketRelay from "./webSocketRelay";
import EventEmitter from "events";

export interface IPeerData {
  command: "setUuid" | "seed" | "propagateChain"
  data?: unknown;
}

export default class Peer extends EventEmitter {
  private wsRelay: WebSocketRelay;
  private uuid = "";
  private blockChain: BlockChain = new BlockChain();
  private neighborsUuids: string[] = [];

  constructor(wsRelay: WebSocketRelay) {
    super();
    this.wsRelay = wsRelay;
  }

  public configureLocalPeer() {
    this.wsRelay.on("clientReceiveMessage", (senderUuid: string, message: IPeerData) => {
      switch (message.command) {
        case "setUuid": this.setUuidCommand(message.data as string); break;
        case "seed": this.seedCommand(message.data as string[]); break;
        case "propagateChain": this.propagateCommand(message.data as IBlock[]); break;
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
    this.startMiner();
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
   * Forge next block and reward a coin if sucess
   */
  public startMiner() {
    console.log(`Peer: Minerating...`);
    const proof = this.blockChain.proofOfWork();

    // Miner rewards
    // Sender is 0 to identify miner coin log
    this.blockChain.newTransaction("0", this.uuid, 1);

    const forgedBlock = this.blockChain.newBlock(this.blockChain.lastBlockHash(), proof);

    console.log(`Peer: New block forged! ${forgedBlock.proof}`);
    this.propagate();
  }

  public propagate() {
    if (this.neighborsUuids.length == 0) return;

    console.log(`Peer: Sending propagate command`);
    this.sendMessageMany(this.neighborsUuids, {
      command: "propagateChain",
      data: this.blockChain.Chain
    });
  }
}