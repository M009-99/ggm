/// Spy Game (من الجاسوس؟) - Discord Bot Implementation
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  Collection
} = require('discord.js');

const config = require('../config.js');
// Load allowedRoleIds from config.json
const { allowedRoleIds } = require('../config.json');
const { pointsManager } = require('../points.js');

// Game state
let spyGameState = {
  active: false,
  players: [],
  playerIds: [],
  spy: null,
  location: null,
  category: null,
  joinPhase: false,
  gamePhase: false,
  votingPhase: false,
  gameMessage: null,
  timeLeft: 0,
  votes: new Map(),
  hostId: null,
  gameChannel: null,
  timerInterval: null,
  locationGuessPhase: false
};

// Locations database
const locations = {
  "أماكن عامة": [
    "مطار", "مستشفى", "مدرسة", "مطعم", "سينما", "متحف", "حديقة", "شاطئ", "فندق", "مول تجاري",
    "مكتبة", "محطة قطار", "ملعب كرة قدم", "حوض سباحة", "مقهى", "سوق شعبي", "صالة رياضية", "مسرح"
  ],
  "مناسبات": [
    "حفل زفاف", "مؤتمر", "مباراة كرة قدم", "حفلة عيد ميلاد", "معرض فني", "مهرجان موسيقي",
    "تخرج", "مقابلة عمل", "اجتماع عائلي", "رحلة مدرسية", "حفل خطوبة", "مسابقة"
  ],
  "وسائل نقل": [
    "طائرة", "قطار", "سفينة", "حافلة", "سيارة أجرة", "مترو الأنفاق", "دراجة نارية",
    "عبّارة", "طائرة هليكوبتر", "قارب شراعي", "سيارة خاصة", "دراجة هوائية"
  ],
  "مهن": [
    "مستشفى", "مدرسة", "مكتب محاماة", "استوديو تصوير", "مطبعة", "مصنع", "مزرعة",
    "مختبر علمي", "محطة إطفاء", "مركز شرطة", "صالون تجميل", "ورشة ميكانيكا"
  ]
};

// Helper functions
function resetSpyGame() {
  clearInterval(spyGameState.timerInterval);
  spyGameState = {
    active: false,
    players: [],
    playerIds: [],
    spy: null,
    location: null,
    category: null,
    joinPhase: false,
    gamePhase: false,
    votingPhase: false,
    gameMessage: null,
    timeLeft: 0,
    votes: new Map(),
    hostId: null,
    gameChannel: null,
    timerInterval: null,
    locationGuessPhase: false
  };
}

function updatePlayerList() {
  if (!spyGameState.gameMessage) return;

  const playerList = spyGameState.players.length > 0
    ? spyGameState.players.map(player => `> 👤 ${player.username || player.user.username}`).join('\n')
    : '> لا يوجد لاعبين حتى الآن';

  const embed = EmbedBuilder.from(spyGameState.gameMessage.embeds[0])
    .setFields(
      { name: 'اللاعبين المشاركين', value: playerList },
      { name: 'الحالة', value: `${spyGameState.players.length}/${config.spy.maxPlayers} لاعب` }
    );

  spyGameState.gameMessage.edit({ embeds: [embed] }).catch(console.error);
}

function formatTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

async function assignRoles() {
  try {
    // Shuffle players
    const shuffledPlayers = [...spyGameState.players].sort(() => 0.5 - Math.random());

    // Select spy
    spyGameState.spy = shuffledPlayers[0];

    // Select location and category
    const categoryKeys = Object.keys(locations);
    const randomCategory = categoryKeys[Math.floor(Math.random() * categoryKeys.length)];
    spyGameState.category = randomCategory;

    const categoryLocations = locations[randomCategory];
    spyGameState.location = categoryLocations[Math.floor(Math.random() * categoryLocations.length)];

    // Send DMs to players
    for (const player of spyGameState.players) {
      try {
        if (player.id === spyGameState.spy.id) {
          await player.send({
            embeds: [
              new EmbedBuilder()
                .setTitle('🕵️ أنت الجاسوس!')
                .setDescription('حاول أن تكتشف المكان دون أن يكتشفك الآخرون.')
                .setColor(config.spy.embedColor)
                .addFields(
                  { name: 'نصائح', value: 'استمع بعناية لأسئلة وإجابات اللاعبين الآخرين لتخمين المكان.' }
                )
            ]
          });
        } else {
          await player.send({
            embeds: [
              new EmbedBuilder()
                .setTitle('🏢 معلومات اللعبة')
                .setDescription(`أنت لست الجاسوس! حاول اكتشاف من هو الجاسوس.`)
                .setColor(config.spy.embedColor)
                .addFields(
                  { name: 'الفئة', value: spyGameState.category },
                  { name: 'المكان', value: spyGameState.location },
                  { name: 'نصائح', value: 'اسأل أسئلة غامضة لا تكشف المكان مباشرة للجاسوس.' }
                )
            ]
          });
        }
      } catch (error) {
        console.error(`Error sending DM to player ${player.username || player.user.username}:`, error);
        spyGameState.gameChannel.send(`⚠️ لم أتمكن من إرسال رسالة خاصة إلى ${player}. تأكد من أن الرسائل الخاصة مفتوحة.`);
      }
    }

    return true;
  } catch (error) {
    console.error('Error assigning roles:', error);
    spyGameState.gameChannel.send('⚠️ حدث خطأ أثناء تعيين الأدوار. يرجى المحاولة مرة أخرى.');
    return false;
  }
}

async function startGameTimer() {
  spyGameState.timeLeft = config.spy.gameDuration;

  const timerEmbed = new EmbedBuilder()
    .setTitle('🕵️ لعبة من الجاسوس؟')
    .setDescription(`
      **كيفية اللعب:**
      1. كل لاعب يسأل لاعبًا آخر سؤالًا واحدًا في كل دور
      2. حاول معرفة من هو الجاسوس دون كشف المكان
      3. الجاسوس يحاول معرفة المكان دون أن يتم كشفه

      **الوقت المتبقي:** ${formatTime(spyGameState.timeLeft)}
    `)
    .setColor(config.spy.embedColor)
    .setFooter({ text: 'استخدم الأمر -تصويت للتصويت على من هو الجاسوس' });

  const timerMessage = await spyGameState.gameChannel.send({ embeds: [timerEmbed] });

  spyGameState.timerInterval = setInterval(() => {
    spyGameState.timeLeft -= 10000; // Update every 10 seconds

    if (spyGameState.timeLeft <= 0) {
      clearInterval(spyGameState.timerInterval);
      startVotingPhase();
      return;
    }

    const updatedEmbed = EmbedBuilder.from(timerEmbed)
      .setDescription(`
        **كيفية اللعب:**
        1. كل لاعب يسأل لاعبًا آخر سؤالًا واحدًا في كل دور
        2. حاول معرفة من هو الجاسوس دون كشف المكان
        3. الجاسوس يحاول معرفة المكان دون أن يتم كشفه

        **الوقت المتبقي:** ${formatTime(spyGameState.timeLeft)}
      `);

    timerMessage.edit({ embeds: [updatedEmbed] }).catch(console.error);
  }, 10000);
}

async function startVotingPhase() {
  try {
    spyGameState.gamePhase = false;
    spyGameState.votingPhase = true;
    spyGameState.votes = new Map();

    // Create voting message with buttons for each player
    const voteEmbed = new EmbedBuilder()
      .setTitle('🗳️ وقت التصويت!')
      .setDescription('من هو الجاسوس؟ صوت الآن!')
      .setColor(config.spy.embedColor)
      .setFooter({ text: `لديك ${config.spy.voteTime / 1000} ثانية للتصويت` });

    const voteButtons = spyGameState.players.map(player =>
      new ButtonBuilder()
        .setCustomId(`vote_spy_${player.id}`)
        .setLabel(player.username || player.user.username)
        .setStyle(ButtonStyle.Secondary)
    );

    const rows = [];
    for (let i = 0; i < voteButtons.length; i += 5) {
      rows.push(new ActionRowBuilder().addComponents(voteButtons.slice(i, Math.min(i + 5, voteButtons.length))));
    }

    const voteMessage = await spyGameState.gameChannel.send({
      embeds: [voteEmbed],
      components: rows
    });

    // Set timeout for voting
    setTimeout(() => {
      if (spyGameState.votingPhase) {
        tallyVotes();
      }
    }, config.spy.voteTime);
  } catch (error) {
    console.error('Error starting voting phase:', error);
    spyGameState.gameChannel.send('⚠️ حدث خطأ أثناء بدء مرحلة التصويت. يرجى المحاولة مرة أخرى.');
  }
}

async function tallyVotes() {
  try {
    spyGameState.votingPhase = false;

    // Count votes
    const voteCounts = new Map();
    for (const [voterId, votedForId] of spyGameState.votes.entries()) {
      const currentCount = voteCounts.get(votedForId) || 0;
      voteCounts.set(votedForId, currentCount + 1);
    }

    // Find player with most votes
    let maxVotes = 0;
    let mostVotedPlayer = null;
    let tie = false;

    for (const [playerId, voteCount] of voteCounts.entries()) {
      if (voteCount > maxVotes) {
        maxVotes = voteCount;
        mostVotedPlayer = playerId;
        tie = false;
      } else if (voteCount === maxVotes) {
        tie = true;
      }
    }

    // Handle results
    if (tie || !mostVotedPlayer) {
      await spyGameState.gameChannel.send('📊 **تعادل في الأصوات!** لم يتم تحديد الجاسوس.');
      await giveSpyChanceToGuess();
    } else {
      const isSpyCaught = mostVotedPlayer === spyGameState.spy.id;

      if (isSpyCaught) {
        await spyGameState.gameChannel.send(`🎉 **تهانينا!** لقد تم اكتشاف الجاسوس <@${spyGameState.spy.id}>!`);
        await endGame(false);
      } else {
        const votedPlayer = spyGameState.players.find(p => p.id === mostVotedPlayer);
        await spyGameState.gameChannel.send(`❌ **خطأ!** <@${mostVotedPlayer}> ليس الجاسوس! الجاسوس الحقيقي هو <@${spyGameState.spy.id}>.`);
        await giveSpyChanceToGuess();
      }
    }
  } catch (error) {
    console.error('Error tallying votes:', error);
    spyGameState.gameChannel.send('⚠️ حدث خطأ أثناء فرز الأصوات. يرجى المحاولة مرة أخرى.');
  }
}

async function giveSpyChanceToGuess() {
  try {
    spyGameState.locationGuessPhase = true;

    // Create location selection menu
    const categoryLocations = locations[spyGameState.category];

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('spy_location_guess')
      .setPlaceholder('اختر المكان الذي تعتقد أنه الصحيح')
      .addOptions(
        categoryLocations.map(location =>
          new StringSelectMenuOptionBuilder()
            .setLabel(location)
            .setValue(location)
        )
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const guessEmbed = new EmbedBuilder()
      .setTitle('🕵️ فرصة الجاسوس للتخمين!')
      .setDescription(`<@${spyGameState.spy.id}> لديك فرصة لتخمين المكان. اختر من القائمة أدناه:`)
      .setColor(config.spy.embedColor)
      .addFields(
        { name: 'الفئة', value: spyGameState.category }
      )
      .setFooter({ text: 'لديك 30 ثانية للتخمين' });

    const guessMessage = await spyGameState.gameChannel.send({
      embeds: [guessEmbed],
      components: [row]
    });

    // Set timeout for guessing
    setTimeout(() => {
      if (spyGameState.locationGuessPhase) {
        spyGameState.gameChannel.send(`⏱️ **انتهى الوقت!** لم يخمن الجاسوس المكان. المكان الصحيح كان: **${spyGameState.location}**`);
        endGame(false);
      }
    }, 30000);
  } catch (error) {
    console.error('Error giving spy chance to guess:', error);
    spyGameState.gameChannel.send('⚠️ حدث خطأ أثناء إعطاء الجاسوس فرصة للتخمين. يرجى المحاولة مرة أخرى.');
    endGame(false);
  }
}

async function handleLocationGuess(interaction, guessedLocation) {
  try {
    spyGameState.locationGuessPhase = false;

    // Check if the guesser is the spy
    if (interaction.user.id !== spyGameState.spy.id) {
      await interaction.reply({
        content: '❌ أنت لست الجاسوس! فقط الجاسوس يمكنه تخمين المكان.',
        ephemeral: true
      });
      return;
    }

    // Check if the guess is correct
    const isCorrect = guessedLocation === spyGameState.location;

    if (isCorrect) {
      await interaction.reply(`🎉 **تهانينا!** لقد خمنت المكان الصحيح: **${spyGameState.location}**`);
      await spyGameState.gameChannel.send(`🕵️ **الجاسوس فاز!** <@${spyGameState.spy.id}> خمن المكان الصحيح: **${spyGameState.location}**`);
      await endGame(true);
    } else {
      await interaction.reply(`❌ **خطأ!** المكان الصحيح كان: **${spyGameState.location}**`);
      await spyGameState.gameChannel.send(`❌ **الجاسوس خسر!** <@${spyGameState.spy.id}> خمن **${guessedLocation}** ولكن المكان الصحيح كان: **${spyGameState.location}**`);
      await endGame(false);
    }
  } catch (error) {
    console.error('Error handling location guess:', error);
    await interaction.reply('⚠️ حدث خطأ أثناء معالجة تخمينك. يرجى المحاولة مرة أخرى.');
  }
}

async function endGame(spyWins) {
  try {
    let pointsMessage = '';

    if (spyWins) {
      // Spy wins - award point to spy
      const newPoints = await pointsManager.awardWin(spyGameState.spy.id);
      pointsMessage = `\n\n🏆 **تم منح نقطة واحدة للجاسوس! النقاط الحالية: ${newPoints}**`;

      // Record losses for other players
      for (const player of spyGameState.players) {
        if (player.id !== spyGameState.spy.id) {
          await pointsManager.recordLoss(player.id);
        }
      }
    } else {
      // Players win - award points to all non-spy players
      let winnerPoints = [];
      for (const player of spyGameState.players) {
        if (player.id !== spyGameState.spy.id) {
          const newPoints = await pointsManager.awardWin(player.id);
          winnerPoints.push(`<@${player.id}>: ${newPoints}`);
        }
      }
      // Record loss for spy
      await pointsManager.recordLoss(spyGameState.spy.id);

      if (winnerPoints.length > 0) {
        pointsMessage = `\n\n🏆 **تم منح نقطة واحدة لكل فائز!**\n${winnerPoints.join(', ')}`;
      }
    }

    // Create summary embed
    const summaryEmbed = new EmbedBuilder()
      .setTitle('🎮 انتهت اللعبة!')
      .setColor(spyWins ? '#00ff00' : '#ff0000')
      .addFields(
        { name: 'الجاسوس', value: `<@${spyGameState.spy.id}>` },
        { name: 'الفئة', value: spyGameState.category },
        { name: 'المكان', value: spyGameState.location },
        { name: 'النتيجة', value: spyWins ? '🕵️ الجاسوس فاز!' : '👥 اللاعبون فازوا!' }
      );

    await spyGameState.gameChannel.send({
      embeds: [summaryEmbed],
      content: pointsMessage
    });

    // Reset game state
    resetSpyGame();
  } catch (error) {
    console.error('Error ending game:', error);
    if (spyGameState.gameChannel) {
      spyGameState.gameChannel.send('⚠️ حدث خطأ أثناء إنهاء اللعبة.');
    }
    resetSpyGame();
  }
}

// Main game handler
async function handleSpyGame(message) {
  try {
    // Check if a game is already active
    if (spyGameState.active) {
      await message.reply('⚠️ **هناك لعبة جارية بالفعل!**');
      return;
    }

    // Initialize game
    resetSpyGame();
    spyGameState.active = true;
    spyGameState.joinPhase = true;
    spyGameState.hostId = message.author.id;
    spyGameState.gameChannel = message.channel;

    // Create join message with buttons
    const embed = new EmbedBuilder()
      .setTitle('🕵️ لعبة من الجاسوس؟')
      .setDescription(`
        **شرح اللعبة:**
        > 🕵️ لاعب واحد سيكون الجاسوس
        > 🏢 باقي اللاعبين سيعرفون المكان
        > ❓ اللاعبون يسألون بعضهم البعض أسئلة للكشف عن الجاسوس
        > 🔍 الجاسوس يحاول معرفة المكان دون أن يتم كشفه

        **الحد الأقصى للاعبين:** ${config.spy.maxPlayers}
        **الحد الأدنى للاعبين:** ${config.spy.minPlayers}

        **ستبدأ اللعبة خلال:** ${config.spy.joinTime / 1000} ثانية
      `)
      .setColor(config.spy.embedColor)
      .addFields(
        { name: 'اللاعبين المشاركين', value: '> لا يوجد لاعبين حتى الآن' },
        { name: 'الحالة', value: `0/${config.spy.maxPlayers} لاعب` }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('join_spy_game')
        .setLabel('انضمام')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('start_spy_game')
        .setLabel('بدء اللعبة')
        .setStyle(ButtonStyle.Primary)
    );

    spyGameState.gameMessage = await message.channel.send({ embeds: [embed], components: [row] });

    // Set timeout to start game automatically
    setTimeout(() => {
      if (spyGameState.joinPhase) {
        startSpyGame();
      }
    }, config.spy.joinTime);
  } catch (error) {
    console.error('Error handling spy game:', error);
    message.channel.send('⚠️ حدث خطأ أثناء بدء اللعبة. يرجى المحاولة مرة أخرى.');
    resetSpyGame();
  }
}

async function startSpyGame() {
  try {
    spyGameState.joinPhase = false;

    // Check if enough players
    if (spyGameState.players.length < config.spy.minPlayers) {
      await spyGameState.gameChannel.send(`❌ **لا يوجد عدد كافٍ من اللاعبين!** مطلوب ${config.spy.minPlayers} لاعبين على الأقل.`);
      resetSpyGame();
      return;
    }

    // Disable join buttons
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('join_spy_game')
        .setLabel('انضمام')
        .setStyle(ButtonStyle.Success)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('start_spy_game')
        .setLabel('بدء اللعبة')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true)
    );

    await spyGameState.gameMessage.edit({ components: [disabledRow] });

    // Assign roles
    spyGameState.gamePhase = true;
    const rolesAssigned = await assignRoles();

    if (!rolesAssigned) {
      resetSpyGame();
      return;
    }

    // Start game timer
    await spyGameState.gameChannel.send('🎮 **بدأت اللعبة!** تم إرسال الأدوار في الرسائل الخاصة.');
    await startGameTimer();
  } catch (error) {
    console.error('Error starting spy game:', error);
    if (spyGameState.gameChannel) {
      spyGameState.gameChannel.send('⚠️ حدث خطأ أثناء بدء اللعبة. يرجى المحاولة مرة أخرى.');
    }
    resetSpyGame();
  }
}

// Handle button interactions
function setupSpyInteractions(client) {
  client.on('interactionCreate', async (interaction) => {
    try {
      // Handle button interactions
      if (interaction.isButton()) {
        const { customId } = interaction;

        if (customId === 'join_spy_game') {
          if (!spyGameState.joinPhase) {
            await interaction.reply({
              content: '❌ **انتهت مرحلة الانضمام!**',
              ephemeral: true
            });
            return;
          }

          if (spyGameState.players.length >= config.spy.maxPlayers) {
            await interaction.reply({
              content: '❌ **اكتمل عدد اللاعبين!**',
              ephemeral: true
            });
            return;
          }

          if (spyGameState.playerIds.includes(interaction.user.id)) {
            await interaction.reply({
              content: '❌ **أنت منضم بالفعل!**',
              ephemeral: true
            });
            return;
          }

          spyGameState.players.push(interaction.user);
          spyGameState.playerIds.push(interaction.user.id);
          updatePlayerList();

          await interaction.reply({
            content: '✅ **تم انضمامك للعبة!**',
            ephemeral: true
          });
        }
        else if (customId === 'start_spy_game') {
          if (!spyGameState.joinPhase) {
            await interaction.reply({
              content: '❌ **اللعبة بدأت بالفعل!**',
              ephemeral: true
            });
            return;
          }

          if (interaction.user.id !== spyGameState.hostId) {
            await interaction.reply({
              content: '❌ **فقط منشئ اللعبة يمكنه بدء اللعبة!**',
              ephemeral: true
            });
            return;
          }

          if (spyGameState.players.length < config.spy.minPlayers) {
            await interaction.reply({
              content: `❌ **لا يوجد عدد كافٍ من اللاعبين!** مطلوب ${config.spy.minPlayers} لاعبين على الأقل.`,
              ephemeral: true
            });
            return;
          }

          await interaction.reply({
            content: '✅ **جاري بدء اللعبة!**',
            ephemeral: true
          });

          startSpyGame();
        }
        else if (customId.startsWith('vote_spy_')) {
          if (!spyGameState.votingPhase) {
            await interaction.reply({
              content: '❌ **التصويت غير متاح حاليًا!**',
              ephemeral: true
            });
            return;
          }

          const votedForId = customId.split('vote_spy_')[1];

          if (!spyGameState.playerIds.includes(interaction.user.id)) {
            await interaction.reply({
              content: '❌ **فقط اللاعبين يمكنهم التصويت!**',
              ephemeral: true
            });
            return;
          }

          spyGameState.votes.set(interaction.user.id, votedForId);

          await interaction.reply({
            content: `✅ **تم تسجيل تصويتك!**`,
            ephemeral: true
          });

          // Check if all players have voted
          if (spyGameState.votes.size === spyGameState.players.length) {
            tallyVotes();
          }
        }
      }
      // Handle select menu interactions
      else if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'spy_location_guess') {
          if (!spyGameState.locationGuessPhase) {
            await interaction.reply({
              content: '❌ **انتهت مرحلة التخمين!**',
              ephemeral: true
            });
            return;
          }

          const guessedLocation = interaction.values[0];
          await handleLocationGuess(interaction, guessedLocation);
        }
      }
    } catch (error) {
      console.error('Error handling spy game interaction:', error);
      if (!interaction.replied) {
        await interaction.reply({
          content: '⚠️ حدث خطأ أثناء معالجة التفاعل. يرجى المحاولة مرة أخرى.',
          ephemeral: true
        });
      }
    }
  });
}

// Command handler for manual voting
async function handleVoteCommand(message) {
  try {
    if (!spyGameState.active || !spyGameState.gamePhase) {
      await message.reply('❌ **لا توجد لعبة نشطة حاليًا!**');
      return;
    }

    if (spyGameState.votingPhase) {
      await message.reply('⚠️ **التصويت جارٍ بالفعل!**');
      return;
    }

    // Check if the user is a player in the game
    if (!spyGameState.playerIds.includes(message.author.id)) {
      await message.reply('❌ **فقط اللاعبين يمكنهم بدء التصويت!**');
      return;
    }

    await message.reply('✅ **بدأت مرحلة التصويت!**');
    clearInterval(spyGameState.timerInterval);
    startVotingPhase();
  } catch (error) {
    console.error('Error handling vote command:', error);
    message.reply('⚠️ حدث خطأ أثناء بدء التصويت. يرجى المحاولة مرة أخرى.');
  }
}

// Export functions
module.exports = {
  handleSpyGame,
  setupSpyInteractions,
  handleVoteCommand,
  isGameActive: () => spyGameState.active
};
