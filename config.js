// Unified configuration for all games
module.exports = {
  // Bot Configuration
  token: process.env.DISCORD_TOKEN,
  prefix: "+",
  // Roles that can use game commands
  allowedRoleIds: [
    "1343402511742009364",
    "1379302045814751272",
    "1363205974554447962",
    "1348827936362598490",
    "1359093960173289492",
    "1379296245121679501",
    "1191963958693867580"
  ],

  // Roulette Game Settings
  roulette: {
    startTime: 50,                // Time in seconds before the game starts
    chooseTimeout: 30,            // Time in seconds for a player to make a choice
    timeBetweenRounds: 10,        // Time in seconds between rounds
    minPlayers: 4,                // Minimum players required
    maxPlayers: 40,               // Maximum players allowed
    embedColor: "#61607e",        // Color for embeds
    commandName: "روليت"          // Command name in Arabic
  },

  // Chairs Game Settings
  chairs: {
    gameDuration: 60000,          // Duration of the game in milliseconds
    roundDuration: 20000,         // Duration of each round in milliseconds
    preparationTime: 10000,       // Preparation time between rounds in milliseconds
    timerUpdateInterval: 5000,    // Interval to update the timer in milliseconds
    maxPlayers: 60,               // Maximum number of players allowed
    embedColor: "#61607e",        // Color for embeds
    commandName: "كراسي",         // Command name in Arabic
    commandPrefix: "+"            // Same prefix as other games
  },

  // Mafia Game Settings
  mafia: {
    startTime: 30000,             // Time for players to join in milliseconds
    mafiaKillTime: 30000,         // Time for mafia phase in milliseconds
    docActionTime: 20000,         // Time for doctor phase in milliseconds
    detectorPhaseTime: 15000,     // Time for detector phase in milliseconds
    citizenVoteTime: 20000,       // Time for citizen voting in milliseconds
    bodyguardPhaseTime: 15000,    // Time for bodyguard phase in milliseconds
    maxPlayers: 10,               // Maximum players allowed
    minPlayers: 2,                // Minimum players required
    embedColor: "#61607e",        // Color for embeds
    commandName: "مافيا"          // Command name in Arabic
  },

  // Spy Game Settings
  spy: {
    gameDuration: 600000,         // 10 minutes in milliseconds
    joinTime: 60000,              // 1 minute for players to join
    voteTime: 60000,              // 1 minute for voting
    minPlayers: 3,                // Minimum players required
    maxPlayers: 10,               // Maximum players allowed
    embedColor: "#61607e",        // Color for embeds
    commandName: "جاسوس"          // Command name in Arabic
  },

  // Button Game Settings
  button: {
    gameDuration: 30000,          // 30 seconds in milliseconds
    embedColor: "#61607e",        // Color for embeds
    commandName: "زر"             // Command name in Arabic
  }
};
