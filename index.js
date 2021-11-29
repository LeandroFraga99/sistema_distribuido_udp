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
  const unbufferedMessage = JSON.parse(String(message));
  console.log(unbufferedMessage);

  const client = clients.find(
    (client) => client.address == rinfo.address && client.port == rinfo.port
  );

  switch (unbufferedMessage.type) {
    case "connect":
      const newClient = { author: unbufferedMessage.author, ...rinfo };
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
          message: unbufferedMessage.message,
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
      console.log(unbufferedMessage);
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
  console.log('Pressione "Ctrl + C" para encerrar.');
});

server.on("error", (error) => {
  console.log("Server Error");
  console.log(error.message);
  server.close();
});
