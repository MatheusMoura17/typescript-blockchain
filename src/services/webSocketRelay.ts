import WebSocket, { Server } from "ws";
import uuid4 from "uuid4";
import EventEmitter from "events";

export interface IWebSocketRelayData {
  sender: string,
  recipient: string
  message: object
}

export default class WebSocketRelay extends EventEmitter {
  private clientSocket: WebSocket | null = null;
  private serverSocket: Server | null = null;
  private connections: Record<string, WebSocket> = {}
  private port = 0;
  private isServer = false;

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
    this.isServer = true;
    this.serverSocket = new Server({
      port: this.port
    });

    console.log("WsRelay: Server started in ws://localhost:" + this.port);

    this.serverSocket.on('connection', (socket: WebSocket) => {

      const uuid = uuid4().replace(/-/g, "");
      this.connections[uuid] = socket;

      this.emit("peerConnected", uuid);

      console.log(`WsRelay: ${this.allUuids.length} client(s)`);

      socket.on("message", (data: WebSocket.Data) => {
        const parsed = JSON.parse(data.toString()) as IWebSocketRelayData;
        // Forwards package to recipient
        this.connections[parsed.recipient].send(data);
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
      sender: this.isServer ? "server" : sender,
      recipient,
      message
    };

    const stringData = JSON.stringify(data);

    if (this.isServer) {
      this.connections[recipient].send(stringData);
    } else {
      this.clientSocket.send(stringData);
    }
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
   * Connect to remote relay
   */
  public connect() {
    this.isServer = false;
    console.log("WsRelay: Connecting to ws://localhost: " + this.port);
    this.clientSocket = new WebSocket("ws://localhost:" + this.port);

    this.clientSocket.on('open', () => {
      console.log("WsRelay: Connected!");
      this.emit("peerConnected");
    });

    this.clientSocket.on('close', (socket: WebSocket) => {
      console.log("WsRelay: Disconnected");
      this.emit("peerDisconnected");
    });

    this.clientSocket.on("message", (data: WebSocket.Data) => {
      const parsed = JSON.parse(data.toString()) as IWebSocketRelayData;

      this.emit("clientReceiveMessage", parsed.sender, parsed.message);
    })
  }
}