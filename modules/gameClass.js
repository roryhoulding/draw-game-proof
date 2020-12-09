const EventEmitter = require('events');
const { text } = require('express');
const startingTexts = require('../data/startingTexts');
const getRandomInt = require('../helpers/getRandomInt');
const findObjectInArray = require('../helpers/findObjectInArray');

module.exports = class Game extends EventEmitter {
  constructor(roomCode, io) {
    // Inherit from parent class
    super();
    
    // Constants
    this.ROUND_DURATION = 5;
    this.roomCode = roomCode;

    // Classes are passed an object as a reference 
    // This will not create a new instance of io every 
    // time a new game is created
    this.io = io;
    
    // Variables
    this.players = [];
    this.sets = [];
    this.started = false;
    this.currentRound = {
      number: 0,
      timeLeft: 0,
      data: {},
      lastRound: false,
    };
  }
  
  startGame() {
    if (this.started) {
      console.log('The game has already begun');
    }
    if (!this.started) {
      // There needs to be one set and one round per player
      // for the game to work correctly
      const numPlayers = this.players.length;

      // Generate each set
      for (let i = 0; i < numPlayers; i++) {
        const set = []
        
        // Generate the round data for the current set
        for (let j = 0; j < numPlayers; j++) {
          const roundData = {
            inputType: j % 2 === 0 ? 'text' : 'drawing',
            outputType: j % 2 === 0 ? 'drawing' : 'text',
            playerID: this.players[(i + j) % numPlayers].id,
          }
          if (j === 0) {
            const randomInt = getRandomInt(0, startingTexts.length - 1);
            roundData.inputData = startingTexts[randomInt];
          }
          set.push(roundData)
        }

        // Add this sets to the games sets
        this.sets.push(set);
      }
      this.started = true;
      console.log('let the games begin');
      console.log(this.io);
      this.io.to(this.roomCode).emit('gameStarted');
      this.nextRound();
    }
  }

  nextRound() {
    // Incrememnt round and reset the currentRound variable
    this.currentRound = {
      number: this.currentRound.number += 1,
      timeLeft: this.ROUND_DURATION,
      data: {},
      lastRound: this.currentRound.lastRound,
    }
    console.log(`Round ${this.currentRound.number}`);

    // Rounds go from 1 to player.length
    // If the round number === player length, this means
    // it is the last round
    // lastRound is used to end the game later
    if (this.currentRound.number === this.players.length) {
      this.currentRound.lastRound = true;
      console.log('last round');
    }

    // Send new round event out
    // Will be caught and used to send newRound and the data
    // out to the clients
    // Send the correct data to each player
    const data = this.sets.map(set => set[this.currentRound.number - 1]);
    for (let set of data) {
      this.io.to(set.playerID).emit('newRound', {
        round: this.currentRound.number,
        data: set,
      })
    }
    // }
    // this.emit('newRound', {
    //   round: this.currentRound.number,
    //   data: this.sets.map(set => set[this.currentRound.number - 1]),
    // });

    // Probably need to get confirmation that 
    // everybody is ready before doing this
    // Have a timeout of 30 seconds for people to connect
    this.currentRound.timeLeft = this.ROUND_DURATION;
    this.currentRound.timer = this.startTimer();
  }

  endGame() {
    for (let set of this.sets) {
      this.io.to(set[0].playerID).emit('results', set);
    }
  }

  
  endRound() {
    // Emitting end round will trigger socket.io to emit
    // endRound to all sockets
    // which will collect the data from each socket and
    // trigger appendRoundData as below
    console.log('End of round');
    this.io.to(this.roomCode).emit('endRound');
  }
  
  startTimer() {
    return setInterval(() => {
      this.io.to(this.roomCode).emit('timeChange', this.currentRound.timeLeft)
      this.currentRound.timeLeft--;
      if (this.currentRound.timeLeft < 0) {
        clearInterval(this.currentRound.timer);
        this.endRound();
      }
    }, 1000);
  }

  setPlayer(player) {
    this.players.push(player);
    this.io.to(this.roomCode).emit('players', this.players);
  }

  deletePlayer(id) {
    // Find the player index in the players array
    const playerIndex = findObjectInArray('id', id, this.players);

    // Delete the player at playerIndex from players
    this.players.splice(playerIndex, 1)

    this.io.to(this.roomCode).emit('players', this.players)
  }
  
  getPlayers() {
    return this.players;
  }

  appendRoundData({playerID, data}) {
    this.currentRound.data[playerID] = data;
    // If the amount of round data = the number of players
    // That means we have the data for each player from that round
    if (this.allRoundDataCollected()) {
      this.updateSets();
    }
  }

  updateSets() {
    // Iterate over all sets
    for (let set of this.sets) {
      const playerID = set[this.currentRound.number - 1].playerID;
      const roundIndex = this.currentRound.number - 1;
      const outputData = this.currentRound.data[playerID];
      // Set the this sets round ouput data as the data
      // that the player wrote or drew
      set[roundIndex].outputData = outputData;
      // Set the this sets next round input data as the data
      // that the player wrote or drew
      if (!this.currentRound.lastRound) {
        set[roundIndex + 1].inputData = outputData;
      }
    }
    if (!this.currentRound.lastRound) {
      this.nextRound();
    } else {
      this.endGame();
    }
  }

  allRoundDataCollected() {
    if ((Object.keys(this.currentRound.data).length) === this.players.length) {
      return true;
    }
    return false;
  }

  init(roomCode, io) {
    console.log('test');
    this.emit('test');
  }

  test() {
    this.io.sockets.emit('test')
  }


}