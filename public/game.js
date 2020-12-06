// Make connection
const socket = io.connect('http://localhost:3000');

// Query DOM
const playerNamesElem = document.querySelector('#player-names');
const timerElem = document.querySelector('#timer');
const roundNumberElem = document.querySelector('#round-number');
const roundInputElem = document.querySelector('#round-input');
const startGameBtn = document.querySelector('#start-game');
const textInputContainer = document.querySelector('#text-input-container');
const textInput = document.querySelector('#text-input');
const canvas = document.querySelector('#canvas');

// Canvas context
const canvasContext = canvas.getContext('2d')

// Global vars
let player = {}
let roundType;

// Helper functions --------------------

// Change UI for the round
const setUI = (type) => {
  if (type === 'text') {
    // canvas.classList.add('hidden');
    textInputContainer.classList.remove('hidden');
  } else if (type === 'drawing') {
    // canvas.classList.remove('hidden');
    textInputContainer.classList.add('hidden');
  }
}

const getCanvasData = () => {
  return canvasContext.getImageData(0, 0, canvas.width, canvas.height);
}

const putCanvasData = (imgData) => {
  canvasContext.putImageData(imgData, 0, 0);
}

const getTextData = () => {
  return textInput.value;
}

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

// Display timer
socket.on('timeChange', (time) => {
  timerElem.innerHTML = `${time}`;
});

socket.on('newRound', ({round, data}) => {
  roundNumberElem.innerHTML = round;
  setUI(data.outputType);
  roundType = data.outputType;
  console.log(roundType);
  console.log(data.inputData);
  if (roundType === 'text') {
    putCanvasData(data.inputData)
  } else if (roundType === 'drawing') {
    roundInputElem.innerHTML = data.inputData;
  }
});

socket.on('endRound', () => {
  let roundOutput;
  if (roundType === 'drawing') {
    roundOutput = getCanvasData();
  } else if (roundType === 'text') {
    roundOutput = getTextData();
  }
  console.log(roundOutput);
  socket.emit('roundData', {
    playerID: player.id,
    data: roundOutput,
  });
  // Clear input elements for next round
  if (roundType === 'drawing') {
    canvasContext.clearRect(0, 0, canvas.width, canvas.height);
  } else if (roundType === 'text') {
    textInput.value = '';
  }
});

// Start game
startGameBtn.addEventListener('click', () => {
  socket.emit('startGame');
});


// Drawing on canvas interaction -------------------------

let drawing = false;

const startPos = (e) => {
  if (roundType === 'drawing') {
    drawing = true;
    draw(e)
  }
}

const endPos = (e) => { 
  drawing = false;
  canvasContext.beginPath();
}

const draw = (e) => {
  if (!drawing) return;
  canvasContext.lineWidth = 5;
  canvasContext.lineCap = 'round';
  canvasContext.lineJoin = "round";
  
  const canvasRect = canvas.getBoundingClientRect();
  const canvasX = canvasRect.x;
  const canvasY = canvasRect.y;

  const xPos = e.clientX - canvasX;
  const yPos = e.clientY - canvasY;

  canvasContext.lineTo(xPos, yPos);
  canvasContext.stroke();
  canvasContext.beginPath();
  canvasContext.moveTo(xPos, yPos);
}

// Event listners
canvas.addEventListener('mousedown', startPos)
canvas.addEventListener('mouseup', endPos)
canvas.addEventListener('mousemove', draw)