const dgram = require("dgram");

const port = 3000;
const address = "localhost";

const clients = [];


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
    case "conexao":
      const newClient = { author: messageServer.author, ...rinfo };
      clients.push(newClient);
      broadcast(
        {
          type: "novaConexao",
          client: newClient,
        },
        newClient
      );

      const connectionInfo = {
        type: "conexaoFeita",
        client: newClient,
      };
      sendUniqueMessage(connectionInfo, newClient);

      break;
    case "msg":
      broadcast(
        {
          type: "msg",
          message: messageServer.message,
          client: client,
        },
        client
      );
      break;
    case "dc":
      broadcast(
        {
          type: "dc",
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

// server.on("connect", () => {
//   console.log("connect");
// });

server.on("listening", () => {
  const serverAddress = server.address();

  console.log(
    `O servidor está ouvindo em ${serverAddress.address}:${serverAddress.port} `
  );
});

// server.on("close", () => {
//   rl.close();
// });

server.on("error", (error) => {
  console.log("Server Error");
  console.log(error.message);
  server.close();
});
