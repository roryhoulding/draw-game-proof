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

// Game rooms storage
const gameRooms = {
  'ABCD': new Game('ABCD', io),
  'UIDH': new Game('UIDH', io),
}

const availableGameRoomCodes = [
  'ABDE',
  'JFUD',
  'HHUF'
]

// Listen for game events --------

io.on('connection', (socket) => {
  console.log('Socket connection created', socket.id);

  let playerGame = null;

  socket.on('newGameRoom', (player) => {
    // Chek if free room available
    if (!availableGameRoomCodes[0]) {
      socket.emit('err', 'No free rooms');
      return;
    }

    // Set room code to last in array of available room codes
    // Use last for effciciency of long array
    const roomCode = availableGameRoomCodes.pop();

    // Player joins socket room
    socket.join(roomCode);

    // Init game
    playerGame = new Game(roomCode, io);
    playerGame.setPlayer(player);
    gameRooms[roomCode] = playerGame;
    socket.emit('joinedRoom');
  })

  socket.on('joinRoom', ({ roomCode, player }) => {
    // Check to see if valid room code
    // If not send error
    if (!gameRooms[roomCode]) {
      socket.emit('invalidRoom');
      return
    }
    socket.join(roomCode);
    gameRooms[roomCode].setPlayer(player);
    playerGame = gameRooms[roomCode];
    socket.emit('joinedRoom');
  })

  // Listen for client events -----

  socket.on('playerJoins', (player) => {
    if (playerGame) playerGame.setPlayer(player);
  })

  socket.on('startGame', () => {
    if (playerGame) playerGame.startGame();
  })

  socket.on('roundData', (data) => {
    if (playerGame) playerGame.appendRoundData(data)
  })

  socket.on('disconnect', (reason) => {
    if (playerGame) playerGame.deletePlayer(socket.id);
  })

})