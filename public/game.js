// Make connection
const socket = io.connect('http://localhost:3000');

// Query DOM
const playerNamesElem = document.querySelector('#player-names');
const timerElem = document.querySelector('#timer');
const roundNumberElem = document.querySelector('#round-number');
const startGameBtn = document.querySelector('#start-game');
const textInputContainer = document.querySelector('#text-input-container');
const textInput = document.querySelector('#text-input');
const roundTextDescription = document.querySelector('#round-text-description');
const canvas = document.querySelector('#canvas');
const imgElem = document.querySelector('#drawing-image');
const gameplayContainer = document.querySelector('#gameplay-container');
const resultsContainer = document.querySelector('#results-container');
const resultsImg = document.querySelector('#results-image');
const resultsTextElem = document.querySelector('#results-text');
const resultsNextBtn = document.querySelector('#results-next');
const resultsPreviousBtn = document.querySelector('#results-previous');
const joinRoomBtn = document.querySelector('#join-room-button');
const roomCodeElem = document.querySelector('#room-code-input');
const createRoomBtn = document.querySelector('#new-room-button');
const joinRoomContainer = document.querySelector('#join-room-container');
const waitingRoomContainer = document.querySelector('#waiting-room-container');

// Canvas context
const canvasContext = canvas.getContext('2d')

// Global vars
let player = {}
let roundType;
let gameSection = 'input'; // input or results
let resultsPage = 0;
let finalSet = [];

// Helper functions --------------------

// Change UI for the round
const setInputUI = (type) => {
  if (type === 'text') {
    textInput.value = '';
    canvas.classList.add('hidden');
    roundTextDescription.classList.add('hidden');
    imgElem.classList.remove('hidden');
    textInputContainer.classList.remove('hidden');
  } else if (type === 'drawing') {
    clearCanvas();
    roundTextDescription.classList.remove('hidden');
    canvas.classList.remove('hidden');
    imgElem.classList.add('hidden');
    textInputContainer.classList.add('hidden');
  }
}

const setResultsUI = ({data, type}) => {
  if (type === 'text') {
    resultsTextElem.classList.remove('hidden');
    resultsImg.classList.add('hidden');
    resultsTextElem.innerHTML = data;
  } else if (type === 'drawing') {
    resultsTextElem.classList.add('hidden');
    resultsImg.classList.remove('hidden');
    resultsImg.src = data;
  }
}

const setUIContainer = (type) => {
  if (type === 'input') {
    gameplayContainer.classList.remove('hidden');
    resultsContainer.classList.add('hidden');
  } else if (type === 'results') {
    gameplayContainer.classList.add('hidden');
    resultsContainer.classList.remove('hidden');
  }
}

const showResult = () => {
  if (resultsPage === 0) {
    setResultsUI({
      type: finalSet[0].inputType,
      data: finalSet[0].inputData
    });
  } else {
    setResultsUI({
      type: finalSet[resultsPage - 1].outputType,
      data: finalSet[resultsPage - 1].outputData
    });
  }
}

const displayInputData = (data) => {
  if (roundType === 'text') {
    imgElem.src = data;
  } else if (roundType === 'drawing') {
    roundTextDescription.innerHTML = data;
  }
}

const getCanvasImage = () => {
  return canvas.toDataURL('image/png');
}

const clearCanvas = () => {
  canvasContext.clearRect(0, 0, canvas.width, canvas.height);
}

const getTextData = () => {
  return textInput.value;
}

// Listen for socket events ---------------------

// Init player
socket.on('connect', () => {
  const playerName = prompt("Please enter your name", "");
  player = {
    id: socket.id,
    name: playerName
  }
});

// Listen for players joining or leaving
// and update the UI to show all players
socket.on('players', (players) => {
  let playerNamesHTML = '';
  for (let player of players) {
    const { name } = player;
    playerNamesHTML += `<p><strong>${name}</strong></p>`
  }
  playerNamesElem.innerHTML = playerNamesHTML;
  console.log(players);
});

// Update the timer
socket.on('timeChange', (time) => {
  timerElem.innerHTML = `${time}`;
});

socket.on('newRound', ({round, data}) => {
  if (round === 1) {
    startGameBtn.classList.add('hidden');
  }
  roundNumberElem.innerHTML = `Round: ${round}`;
  roundType = data.outputType;
  setInputUI(data.outputType);
  displayInputData(data.inputData);
});

socket.on('endRound', async () => {
  let roundOutput;
  if (roundType === 'drawing') {
    // convert to base 64
    // "You probably want to consider some form of byte encoding though (such as f.ex base-64) as any byte value above 127 (ASCII) is subject to character encoding used on a system"
    roundOutput = getCanvasImage();
  } else if (roundType === 'text') {
    roundOutput = getTextData();
  }
  socket.emit('roundData', {
    playerID: player.id,
    data: roundOutput,
  });
});

// Time to display results
socket.on('results', set => {
  setUIContainer('results');
  finalSet = set;
  showResult();
});

// Joined room
socket.on('joinedRoom', () => {
  waitingRoomContainer.classList.remove('hidden');
  joinRoomContainer.classList.add('hidden');
});

// Error
socket.on('err', (err) => {
  console.log(err);
});

// On game start
socket.on('gameStarted', () => {
  waitingRoomContainer.classList.add('hidden');
  gameplayContainer.classList.remove('hidden');
})

socket.on('test', () => console.log('test!'));

// Start game
startGameBtn.addEventListener('click', () => {
  socket.emit('startGame');
});

// Next results page
resultsNextBtn.addEventListener('click', () => {
  resultsPage = resultsPage === finalSet.length ? resultsPage : resultsPage + 1;
  showResult();
})

// Previous results page
resultsPreviousBtn.addEventListener('click', () => {
  resultsPage = resultsPage === 0 ? 0 : resultsPage - 1;
  showResult();
})

// Join room
joinRoomBtn.addEventListener('click', () => {
  socket.emit('joinRoom', {
    player,
    roomCode: roomCodeElem.value,
  })
})

// Create room
createRoomBtn.addEventListener('click', () => {
  socket.emit('newGameRoom', player);
})


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