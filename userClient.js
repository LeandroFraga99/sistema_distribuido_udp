const readline = require("readline");
const dgram = require("dgram");

const server = {
  host: "localhost",
  port: 3000,
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

function writeMsgTerminal(message) {
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  console.log(message);
}

const userClient = dgram.createSocket("udp4");

let userName;
rl.question("Informe seu nome: ", (answer) => {
  userName = answer;
  connectServer();
});

function sendMessage(message, options) {
  const buffer = Buffer.from(JSON.stringify(message));

  userClient.send(buffer, 0, buffer.length, server.port, server.host, () => {
    if (options?.closeServerAfterSendMessage) {
      userClient.close();
      writeMsgTerminal("Conexão encerrada com sucesso!");
    }
  });
}

function connectServer() {
  userClient.bind();

  userClient.on("listening", () => {
    const connect = {
      type: "connect",
      author: userName,
    };

    sendMessage(connect);
  });

  userClient.on("message", (message) => {
    const unbufferedMessage = JSON.parse(String(message));

    switch (unbufferedMessage.type) {
      case "conectionSuccessful":
        console.log(
          `Você foi conectado com o IP: ${unbufferedMessage.client.address}`
        );
        console.log(`(Digite "exit" para encerrar) \n`);
        rl.setPrompt(`${unbufferedMessage.client.address} | ${userName}: `);
        startChat();
        break;
      case "newConnection":
        writeMsgTerminal(
          `O usuario ${unbufferedMessage.client.author} se conectou ao servidor \n`
        );
        rl.prompt();
        break;
      case "message":
        writeMsgTerminal(
          `${unbufferedMessage.client.address} | ${unbufferedMessage.client.author}: ${unbufferedMessage.message}`
        );
        rl.prompt();
        break;
      case "disconnect":
        userClient.close();
        writeMsgTerminal(
          `A conexão foi encerrada por ${unbufferedMessage.client.author}!`
        );
        break;
      default:
        console.log(unbufferedMessage);
        break;
    }
  });

  userClient.on("error", (err) => {
    console.log(err);
  });

  userClient.on("close", function () {
    rl.close();
    console.log('Pressione "Ctrl + C" para encerrar.');
  });
}

function startChat() {
  rl.prompt();

  rl.on("line", (input) => {
    rl.prompt();
    if (input.trim().length == 0) {
      return rl.write("Mensagem Inválida");
    }

    switch (input) {
      case 'exit':
        const messageDisconnect = {
          type: "disconnect",
        };
        sendMessage(messageDisconnect, { closeServerAfterSendMessage: true });
        break;
      default:
        const message = {
          message: input,
          type: "message",
        };
        sendMessage(message);
        break;
    }
  });
}
