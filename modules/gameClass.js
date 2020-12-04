const EventEmitter = require('events');
const { text } = require('express');
const startingTexts = require('../data/startingTexts');
const getRandomInt = require('../helpers/getRandomInt');
const findObjectInArray = require('../helpers/findObjectInArray');

module.exports = class Game extends EventEmitter {
  constructor() {
    // Inherit from parent class
    super();
    
    // Constants
    this.ROUND_DURATION = 5,
    
    // Variables
    this.players = [];
    this.sets = [];
    this.started = false,
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
      this.emit('started', 'Let the games begin!');
      this.nextRound();
    }
  }

  endGame() {
    console.log('End of game');
    console.log(this.sets);
  }

  nextRound() {
    this.currentRound = {
      number: this.currentRound.number += 1,
      timeLeft: this.ROUND_DURATION,
      data: {},
      lastRound: this.currentRound.lastRound,
    }
    console.log(`Round ${this.currentRound.number}`);
    if (this.currentRound.number <= this.players.length) {
      if (this.currentRound.number === this.players.length) {
        this.currentRound.lastRound = true;
        console.log('last round');
      }
      this.emit('newRound', this.currentRound.number);
      this.currentRound.timeLeft = this.ROUND_DURATION;
      this.currentRound.timer = this.startTimer();
    }
  }
  
  endRound() {
    // Emitting end round will trigger socket.io to emit
    // endRound to all sockets
    // which will collect the data from each socket and
    // trigger appendRoundData as below
    this.emit('endRound');
  }
  
  startTimer() {
    return setInterval(() => {
      this.emit('timeChange', this.currentRound.timeLeft);
      this.currentRound.timeLeft--;
      if (this.currentRound.timeLeft < 0) {
        clearInterval(this.currentRound.timer);
        this.endRound();
      }
    }, 1000);
  }

  setPlayer(player) {
    this.players.push(player);
    this.emit('playerCreated', this.players)
  }

  deletePlayer(id) {
    // Find the player index in the players array
    const playerIndex = findObjectInArray('id', id, this.players);

    // Delete the player at playerIndex from players
    this.players.splice(playerIndex, 1)

    this.emit('playerDeleted', this.players)
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


}