import BlockChain from "./blockChain";
import WebSocketRelay from "./webSocketRelay";
import EventEmitter from "events";

export interface IPeerData {
  command: "setUuid" | "seed"
  data?: unknown;
}

export default class Peer extends EventEmitter {
  private wsRelay: WebSocketRelay;
  private uuid = "";
  private blockChain: BlockChain;
  private neighborsUuids = new Set<string>();

  constructor(wsRelay: WebSocketRelay) {
    super();
    this.wsRelay = wsRelay;
  }

  public configureLocalPeer() {
    this.wsRelay.on("clientReceiveMessage", (senderUuid: string, message: IPeerData) => {
      switch (message.command) {
        case "setUuid": this.setUuidCommand(message.data as string); break;
        case "seed": this.seedCommand(message.data as string[]); break;
      }
    });
  }

  public configureServerSidePeer(uuid: string) {
    // Initilization
    this.uuid = uuid;

    this.wsRelay.on("serverReceiveMessage", (senderUuid: string, message: IPeerData) => {
      switch (message.command) {
        case "setUuid": this.setUuidCommand(message.data as string); break;
        case "seed": this.seedCommand(message.data as string[]); break;
      }
    });

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
    this.blockChain = new BlockChain();
    console.log(`Peer: Setted UUID: ${uuid}`);
  }

  /**
   * Process remote call of seed, this method refresh current node list
   * @param neighborsUuids 
   */
  private seedCommand(neighborsUuids: string[]) {
    this.neighborsUuids = new Set<string>(neighborsUuids);
    console.log(`Peer: Received seed from server`);
    console.log(neighborsUuids);
  }

  /**
   * Forge next block and reward coin
   */
  public mine() {
    console.log("\t${this.uuid}: Miner starter...");

    const proof = this.blockChain.proofOfWork();
    // Miner rewards
    // Sender is 0 to identify miner coin log
    this.blockChain.newTransaction("0", "UUID-HERE", 1);

    this.blockChain.newBlock(this.blockChain.lastBlockHash(), proof);

    console.log("\t${this.uuid}: new Block forged!");
  }
}