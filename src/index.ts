import Pool from "./services/pool";

const pool = new Pool();

const runAsPoolServer = process.argv.length >= 2 ? process.argv[2] : false;

if (runAsPoolServer) {
  pool.listen();
} else {
  pool.connect();
}