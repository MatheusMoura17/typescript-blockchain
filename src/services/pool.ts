import WebSocketRelay from "./webSocketRelay";
import Peer from "./peer";

export default class Pool {
  private wsRelay = new WebSocketRelay();
  private peers: Record<string, Peer> = {};
  private isServer = false;

  constructor() {
    this.wsRelay.on("peerConnected", (uuid) => {

      const peer = new Peer(this.wsRelay);

      if (this.isServer) {
        this.peers[uuid] = peer;
        console.log(`Pool: ${uuid} connected`);
        peer.configureServerSidePeer(uuid)
        this.seed();
      } else {
        peer.configureLocalPeer();
      }
    })

    this.wsRelay.on("peerDisconnected", (uuid) => {
      if (this.isServer) {
        delete this.peers[uuid];
        console.log(`Pool: ${uuid} disconnected`);
        this.seed();
      }
    })
  }

  /**
   * Run a new pool server 
   */
  public listen() {
    this.isServer = true;
    this.wsRelay.listen();
    console.log("Pool: Server started");
  }

  /**
   * Connect with remote pool of peers
   */
  public connect() {
    this.wsRelay.connect();
    console.log("Pool: Connected to pool");
  }

  /**
   * Update neighbors in all connected clients 
   * @param peer 
   */
  private seed() {
    Object
      .entries(this.peers)
      .forEach(([uuid, peer]) => {

        // List of ids without id current peer id, prevents seed redundancy
        const uuids = this.wsRelay.allUuids
          .filter(storedUuid => storedUuid !== uuid);

        peer.sendMessage(uuid, {
          command: "seed",
          data: uuids
        });
      });
  }
}