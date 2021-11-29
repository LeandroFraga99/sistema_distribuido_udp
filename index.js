const dgram = require("dgram");

const port = 3000;
const address = "10.242.198.181";

const clients = [];

const { networkInterfaces } = require("os");

const nets = networkInterfaces();
const results = Object.create(null); // Or just '{}', an empty object

for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
    if (net.family === "IPv4" && !net.internal) {
      if (!results[name]) {
        results[name] = [];
      }
      results[name].push(net.address);
    }
  }
}

console.log(results);

const broadcast = (message, sendingUser, options) => {
  const clientsToSend = sendingUser
    ? clients.filter(
        (client) =>
          client.address != sendingUser.address ||
          client.port != sendingUser.port
      )
    : clients;

  clientsToSend.map((client, index) => {
    if (options?.closeServerAfterSend && clients.length == index) {
      return sendUniqueMessage(message, client, () => {
        server.close();
        console.log(`Server encerrado por ${sendingUser?.author}`);
      });
    }

    sendUniqueMessage(message, client);
  });
};

function sendUniqueMessage(message, client, callback) {
  const msgBuffered = Buffer.from(JSON.stringify(message));

  return server.send(
    msgBuffered,
    0,
    msgBuffered.length,
    client.port,
    client.address,
    callback
  );
}

const server = dgram.createSocket("udp4");

server.bind({
  address,
  port,
});

server.on("message", (message, rinfo) => {
  const messageServer = JSON.parse(String(message));

  const client = clients.find(
    (client) => client.address == rinfo.address && client.port == rinfo.port
  );

  switch (messageServer.type) {
    case "connect":
      const newClient = { author: messageServer.author, ...rinfo };
      clients.push(newClient);
      broadcast(
        {
          type: "newConnection",
          client: newClient,
        },
        newClient
      );

      const connectionInfo = {
        type: "conectionSuccessful",
        client: newClient,
      };
      sendUniqueMessage(connectionInfo, newClient);

      break;
    case "message":
      broadcast(
        {
          type: "message",
          message: messageServer.message,
          client: client,
        },
        client
      );
      break;
    case "disconnect":
      broadcast(
        {
          type: "disconnect",
          client: client,
        },
        client,
        { closeServerAfterSend: true }
      );
      break;
    default:
      console.log(messageServer);
      break;
  }
});

server.on("connect", () => {
  console.log("connect");
});

server.on("listening", () => {
  const serverAddress = server.address();

  console.log(
    `O servidor está ouvindo em ${serverAddress.address}:${serverAddress.port} `
  );
});

server.on("close", () => {
  rl.close();
});

server.on("error", (error) => {
  console.log("Server Error");
  console.log(error.message);
  server.close();
});
