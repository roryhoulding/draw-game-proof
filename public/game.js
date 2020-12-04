// Make connection
const socket = io.connect('http://localhost:3000');

// Query DOM
const playerNamesElem = document.querySelector('#player-names');
const timerElem = document.querySelector('#timer');
const roundNumberElem = document.querySelector('#round-number');
const roundInputElem = document.querySelector('#round-input');
const startGameBtn = document.querySelector('#start-game');

// Global vars
let player = {}
let roundOutput = 'trev';

// Init player
socket.on('connect', () => {
  // Get user name and emit player
  const playerName = prompt("Please enter your name", "");
  player = {
    id: socket.id,
    name: playerName
  }
  // Send player to server
  socket.emit('playerJoins', player);
});

// Listen for new players or players leaving
socket.on('players', (players) => {
  let playerNamesHTML = '';
  for (let player of players) {
    const { name } = player;
    playerNamesHTML += `<p><strong>${name}</strong></p>`
  }
  playerNamesElem.innerHTML = playerNamesHTML;
});

socket.on('timeChange', (time) => {
  timerElem.innerHTML = `${time}`;
});

socket.on('newRound', (roundNumber) => {
  roundNumberElem.innerHTML = roundNumber;
});

socket.on('endRound', () => {
  console.log('End of round');
  socket.emit('roundData', {
    playerID: player.id,
    data: roundOutput,
  });
});

// Start game
startGameBtn.addEventListener('click', () => {
  socket.emit('startGame');
});