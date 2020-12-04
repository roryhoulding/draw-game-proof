const express = require('express');
const socket = require('socket.io');
const Game = require('./modules/gameClass');

// App setup
const app = express();
const server = app.listen(3000, () => {
  console.log('Listening on port 3000');
});

// Static files
app.use(express.static('public'));

// Socket setup
const io = socket(server);

// Init game
const game = new Game();

// Listen for game events --------

game.on('started', (msg) => {
  console.log(msg);
})

game.on('timeChange', (timeLeft) => {
  io.sockets.emit('timeChange', timeLeft)
})

game.on('playerCreated', (players) => {
  io.sockets.emit('players', players)
})

game.on('playerDeleted', (players) => {
  io.sockets.emit('players', players)
})

game.on('newRound', (roundNumber) => {
  io.sockets.emit('newRound', roundNumber)
});

game.on('endRound', () => {
  console.log('End of round');
  io.sockets.emit('endRound');
});

io.on('connection', (socket) => {
  console.log('Socket connection created', socket.id);

  // Listen for client events -----

  socket.on('playerJoins', (player) => {
    game.setPlayer(player);
  })

  socket.on('startGame', () => {
    game.startGame();
  })

  socket.on('roundData', (data) => {
    game.appendRoundData(data)
  })

  socket.on('disconnect', (reason) => {
    game.deletePlayer(socket.id);
  })

})