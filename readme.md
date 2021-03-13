## About

This project is a version of https://github.com/dvf/blockchain in **typecript** + **express**. 

## How to use

run `npm i` to install dependencies
run `npm start` to start server

Use postman or other rest api assistent to run routes.:

GET <- `/` - Receive server `OK` status;
GET <- `/mine` - Miner next block;
POST -> `/transaction/new` - Make new transaction request (the transaction has be attached in next forget block by miner);
GET <- `/chain` - Get current chain;
POST -> `/nodes/register` - Add new peer to this server
GET <- `/resolve` - Before start you need sync chain data with added nodes (peers) use `/resolve` to populate or resolve chain conflicts between you and nodes.

## Next steps

- [ ] Add peer to peer websocket comunication with peer.js.
- [ ] Add wallet with UUID.
