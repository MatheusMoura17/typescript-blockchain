import WebSocket, { Server } from "ws";
import uuid4 from "uuid4";
import EventEmitter from "events";

export interface IWebSocketRelayData {
  sender: string,
  message: object
}

export default class WebSocketRelay extends EventEmitter {
  private socket: Server | WebSocket | null = null;
  private connections: Record<string, WebSocket> = {}
  private port = 0;

  /** 
   * Current list of connected user ids
   */
  public get allUuids() {
    return Object.keys(this.connections);
  }

  constructor(port: number = 8100) {
    super();
    this.port = port;
  }

  /**
   * Run a new relay server
   */
  public listen() {
    this.socket = new Server({
      port: this.port
    });

    console.log("WsRelay: Server started in ws://localhost:" + this.port);

    this.socket.on('connection', (socket: WebSocket) => {

      const uuid = uuid4().replace(/-/g, "");
      this.connections[uuid] = socket;

      this.emit("peerConnected", uuid);

      console.log(`WsRelay: ${this.allUuids.length} client(s)`);

      socket.on("message", (data: WebSocket.Data) => {
        const parsed = JSON.parse(data.toString()) as IWebSocketRelayData;

        this.emit("serverReceiveMessage", parsed.sender, parsed.message);
      })

      // Peer socket is closed
      socket.on("close", () => {
        delete this.connections[uuid];
        console.log(`WsRelay: ${this.allUuids.length} client(s)`);
        this.emit("peerDisconnected", uuid);
      });
    });
  }

  /**
   * Send message to target UUID in network
   * @param sender User sending data
   * @param recipient Target user to be receive data
   * @param message data message
   */
  public sendMessage(sender: string, recipient: string, message: object) {
    const data: IWebSocketRelayData = {
      sender,
      message
    }
    this.connections[recipient].send(JSON.stringify(data))
  }

  /**
   * Send message to one or more target UUIDs in network
   * @param sender User sending data
   * @param recipients Array of uuids to be receive data
   * @param message data message
   */
  public sendMessageMany(sender: string, recipients: string[], message: object) {
    recipients.forEach(recipient => {
      this.sendMessage(sender, recipient, message);
    })
  }

  /**
   * Send message to all UUIDs in current network
   * @param sender User sending data
   * @param message data message
   */
  public broadcastMessage(sender: string, message: object) {
    this.allUuids.forEach(recipient => {
      // Prevents message redundancy
      if (sender !== recipient) {
        this.sendMessage(sender, recipient, message);
      }
    });
  }


  /**
   * Connect to remote relay
   */
  public connect() {
    console.log("WsRelay: Connecting to ws://localhost: " + this.port);
    this.socket = new WebSocket("ws://localhost:" + this.port);

    this.socket.on('open', () => {
      console.log("WsRelay: Connected!");
      this.emit("peerConnected");
    });

    this.socket.on('close', (socket: WebSocket) => {
      console.log("WsRelay: Disconnected");
      this.emit("peerDisconnected");
    });

    this.socket.on("message", (data: WebSocket.Data) => {
      const parsed = JSON.parse(data.toString()) as IWebSocketRelayData;

      this.emit("clientReceiveMessage", parsed.sender, parsed.message);
    })
  }
}