const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    StringSelectMenuBuilder,
    PermissionsBitField,
  } = require('discord.js');

  const config = require('../config.js');

  // Game state
  let gameState = {
    players: [],
    allPlayers: [],
    playerRoles: new Map(),
    mafias: [],
    doctor: null,
    detector: null,
    bodyguard: null,
    mayor: null,
    president: null,
    presidentUsedAbility: false,
    gameActive: false,
    protectedPlayer: null,
    shieldedPlayer: null,
    shieldedPlayerRound: null,
    killedPlayer: null,
    votes: new Map(),
    skipVotes: 0,
    totalVotes: 0,
    mafiaActions: new Map(),
    doctorActionTaken: false,
    doctorPhaseEnded: false,
    detectorUsedAbility: false,
    bodyguardUsedAbility: false,
    bodyguardPhaseEnded: false,
    gameMessage: null,
    mafiaMessages: new Map(),
    mafiaInteractions: new Map(),
    doctorInteraction: null,
    detectorInteraction: null,
    bodyguardInteraction: null,
    mayorInteraction: null,
    votePhaseActive: false,
    mafiaPhaseEnded: false,
    mafiaTimeout: null,
    currentRound: 0,
    mafiaThread: null,
  };

  const interactions = new Map();
  let gameInterval = null;
  let gameTimeouts = [];

  // Load allowedRoleIds from config.json
  const { allowedRoleIds } = require('../config.json');
  const { pointsManager } = require('../points.js');

  // Game configuration from unified config
  const mafiaConfig = {
    allowedRoleIds: allowedRoleIds,
    startTime: config.mafia.startTime,
    mafiaKillTime: config.mafia.mafiaKillTime,
    docActionTime: config.mafia.docActionTime,
    detectorPhaseTime: config.mafia.detectorPhaseTime,
    citizenVoteTime: config.mafia.citizenVoteTime,
    bodyguardPhaseTime: config.mafia.bodyguardPhaseTime,
    maxPlayers: config.mafia.maxPlayers,
    minPlayers: config.mafia.minPlayers,
    embedColor: config.mafia.embedColor
  };

  async function handleMafiaGame(message) {
    try {
      const member = message.member;

      // Check if user has any of the allowed roles
      const hasPermission = mafiaConfig.allowedRoleIds.some(roleId => member.roles.cache.has(roleId));
      if (!hasPermission) {
        await message.reply('❌ **ليس لديك الإذن لبدء اللعبة.**');
        return;
      }

      if (gameState.gameActive) {
        await message.channel.send('⚠️ **اللعبة جارية بالفعل.**');
        return;
      }

      await startGame(message);
    } catch (error) {
      console.error('Error in handleMafiaGame:', error);
      await message.channel.send('❌ **حدث خطأ غير متوقع أثناء معالجة الرسالة.**');
    }
  }

  async function startGame(message) {
    try {
      resetGame();

      gameState.gameActive = true;
      gameState.allPlayers = [];

      const embed = new EmbedBuilder()
        .setTitle('🔥 **لعبة مافيا** 🔥')
        .setDescription(
          `اضغط على الزر أدناه للانضمام إلى اللعبة.\n\nستبدأ اللعبة في ${mafiaConfig.startTime / 1000} ثوانٍ.`
        )
        .setColor(mafiaConfig.embedColor)
        .addFields(
          {
            name: 'عدد اللاعبين',
            value: `0/${mafiaConfig.maxPlayers}`,
            inline: true,
          },
          {
            name: 'الوقت المتبقي',
            value: `${mafiaConfig.startTime / 1000} ثواني`,
            inline: true,
          },
          {
            name: 'اللاعبين المنضمين',
            value: 'لا يوجد لاعبون حتى الآن.',
          }
        )
        .setFooter({ text: 'انضم الآن واستمتع باللعبة!' })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('join_game')
          .setLabel('انضم إلى اللعبة')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('leave_game')
          .setLabel('مغادرة اللعبة')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('game_info')
          .setLabel('شرح')
          .setStyle(ButtonStyle.Secondary)
      );

      gameState.gameMessage = await message.channel.send({
        embeds: [embed],
        components: [row],
      });

      let timeLeft = mafiaConfig.startTime / 1000;
      gameInterval = setInterval(async () => {
        try {
          timeLeft--;

          const joinedPlayers = gameState.players.length
            ? gameState.players.map((id) => `<@${id}>`).join(', ')
            : 'لا يوجد لاعبون حتى الآن.';

          const allPlayers = gameState.allPlayers.length
            ? gameState.allPlayers.map((id) => `<@${id}>`).join(', ')
            : 'لا يوجد لاعبون حتى الآن.';

          const updatedEmbed = EmbedBuilder.from(embed)
            .setFields(
              {
                name: 'عدد اللاعبين',
                value: `${gameState.players.length}/${mafiaConfig.maxPlayers}`,
                inline: true,
              },
              {
                name: 'الوقت المتبقي',
                value: `${timeLeft} ثواني`,
                inline: true,
              },
              {
                name: 'اللاعبين المنضمين',
                value: joinedPlayers,
              }
            )
            .setDescription(
              `اضغط على الزر أدناه للانضمام إلى اللعبة.\n\nستنطلق اللعبة قريبًا!`
            );

          if (timeLeft <= 0) {
            clearInterval(gameInterval);
            gameInterval = null;

            const disabledRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('join_game')
                .setLabel('انضم إلى اللعبة')
                .setStyle(ButtonStyle.Success)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('leave_game')
                .setLabel('مغادرة اللعبة')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true)
            );

            if (gameState.gameMessage) {
              await gameState.gameMessage.edit({
                embeds: [updatedEmbed],
                components: [disabledRow],
              }).catch((error) => {
                console.error('Error editing game message:', error);
                gameState.gameMessage = null;
              });
            }

            if (gameState.players.length >= mafiaConfig.minPlayers) {
              await assignRoles(message.channel);
            } else {
              gameState.gameActive = false;
              await message.channel.send('❌ **لم ينضم عدد كافٍ من اللاعبين. تم إلغاء اللعبة.**');
              resetGame();
            }
          } else {
            if (gameState.gameMessage) {
              await gameState.gameMessage.edit({ embeds: [updatedEmbed], components: [row] }).catch((error) => {
                console.error('Error editing game message:', error);
                gameState.gameMessage = null;
              });
            }
          }
        } catch (error) {
          console.error('Error in game interval:', error);
        }
      }, 1000);
    } catch (error) {
      console.error('Error in startGame:', error);
      await message.channel.send('❌ **حدث خطأ أثناء بدء اللعبة.**');
    }
  }

  // Setup interaction handlers
  function setupMafiaInteractions(client) {
    client.on('interactionCreate', async (interaction) => {
      try {
        if (!interaction.isButton()) return;

        const { customId } = interaction;

        if (customId === 'join_game') {
          if (gameState.players.length >= mafiaConfig.maxPlayers) {
            await interaction.reply({
              content: '❌ **تم الوصول إلى الحد الأقصى من اللاعبين.**',
              ephemeral: true,
            });
            return;
          }

          if (!gameState.players.includes(interaction.user.id)) {
            gameState.players.push(interaction.user.id);
            if (!gameState.allPlayers.includes(interaction.user.id)) {
              gameState.allPlayers.push(interaction.user.id);
            }
            interactions.set(interaction.user.id, interaction);
            await interaction.reply({
              content: '✅ **لقد انضممت إلى اللعبة!**',
              ephemeral: true,
            });
          } else {
            await interaction.reply({
              content: '❌ **أنت بالفعل في اللعبة!**',
              ephemeral: true,
            });
          }
        } else if (customId === 'leave_game') {
          if (gameState.players.includes(interaction.user.id)) {
            gameState.players = gameState.players.filter((id) => id !== interaction.user.id);
            await interaction.reply({
              content: '❌ **لقد غادرت اللعبة.**',
              ephemeral: true,
            });
          } else {
            await interaction.reply({
              content: '❌ **أنت لست في اللعبة.**',
              ephemeral: true,
            });
          }
        } else if (customId === 'game_info') {
          await interaction.reply({
            content: `**🎮 شرح لعبة المافيا**

  في عندك مافيا و طبيب ومحقق وحارس وعمدة ورئيس,
  عدد مافيا اقل من 8 يكون 1 مافيا و8 وفوق يكون 2 مافيا 15 لاعل يكون 3 مافيا و 23 لاعب يكون 4 مافيا

  **🩺 الطبيب:** يحمي من القتل نفس الطبيعي

  **🕵️ المحقق:** له فرصه وحده بس للعبة كلها يطلع رول حق شخص واحد يختاره او يعمله سكب عادي

  **🛡️ الحارس:** يعطي درع لشخص واحد يختاره ومايطلع اسمه للمافيا بالدور الجاي

  **👑 العمدة:** من يصوت مع المواطنين كل صوت له ينحسب صوتين مرتين يعني

  **🎖️ الرئيس:** له فرصه وحده يقلب الاصوات حق المواطنين على شخص واحد ببآله

  واذا كان عدد المافيا 2 وفوق البوت تلقائي يعملهم ثريد (شات خاص) لهم يتناقشون فيه مين يقتلون والخ ..`,
            ephemeral: true,
          });
        } else if (customId.startsWith('kill_')) {
          await handleMafiaKill(interaction);
        } else if (customId.startsWith('protect_')) {
          await handleDoctorProtect(interaction);
        } else if (customId.startsWith('detect_')) {
          await handleDetectorDetect(interaction);
        } else if (customId === 'skip_detect') {
          await handleDetectorSkip(interaction);
        } else if (customId.startsWith('shield_')) {
          await handleBodyguardShield(interaction);
        } else if (customId === 'skip_shield') {
          await handleBodyguardSkip(interaction);
        } else if (customId.startsWith('vote_')) {
          await handleVote(interaction);
        } else if (customId === 'skip_vote') {
          await handleSkipVote(interaction);
        } else if (customId === 'president_ability') {
          await handlePresidentAbility(interaction);
        } else if (customId.startsWith('president_select_')) {
          await handlePresidentSelection(interaction);
        }
      } catch (error) {
        console.error('Error in interactionCreate:', error);
        if (!interaction.replied) {
          await interaction.reply({
            content: '❌ **حدث خطأ غير متوقع. حاول مرة أخرى.**',
            ephemeral: true,
          });
        }
      }
    });
  }

  async function assignRoles(channel) {
    try {
      if (!gameState.gameActive) return;

      gameState.allPlayers = [...gameState.players];

      const shuffledPlayers = gameState.players.sort(() => Math.random() - 0.5);

      if (shuffledPlayers.length < 6) {
        await channel.send('❌ **عدد اللاعبين غير كافٍ لتعيين جميع الأدوار. تحتاج على الأقل إلى 6 لاعبين.**');
        resetGame();
        return;
      }

      let mafiaCount = 1;
      if (shuffledPlayers.length >= 8) {
        mafiaCount = 2;
      }
      if (shuffledPlayers.length >= 15) {
        mafiaCount = 3;
      }
      if (shuffledPlayers.length >= 23) {
        mafiaCount = 4;
      }

      gameState.mafias = shuffledPlayers.slice(0, mafiaCount);
      gameState.doctor = shuffledPlayers[mafiaCount];
      gameState.detector = shuffledPlayers[mafiaCount + 1];
      gameState.bodyguard = shuffledPlayers[mafiaCount + 2];
      gameState.mayor = shuffledPlayers[mafiaCount + 3];
      gameState.president = shuffledPlayers[mafiaCount + 4];

      shuffledPlayers.slice(mafiaCount + 5).forEach((player) => {
        gameState.playerRoles.set(player, 'مواطن');
      });

      for (const mafia of gameState.mafias) {
        gameState.playerRoles.set(mafia, 'مافيا');
      }
      gameState.playerRoles.set(gameState.doctor, 'طبيب');
      gameState.playerRoles.set(gameState.detector, 'محقق');
      gameState.playerRoles.set(gameState.bodyguard, 'حارس شخصي');
      gameState.playerRoles.set(gameState.mayor, 'عمدة');
      gameState.playerRoles.set(gameState.president, 'رئيس');

      for (const playerId of gameState.players) {
        const role = gameState.playerRoles.get(playerId);
        const interaction = interactions.get(playerId);

        if (interaction) {
          if (!interaction.replied) {
            await interaction.deferReply({ ephemeral: true }).catch((error) => {
              console.error(`Error deferring interaction for player ${playerId}:`, error);
            });
          }
          await interaction.followUp({
            ephemeral: true,
            content: `🎭 **دورك هو:** **${role.toUpperCase()}**.`,
          }).catch((error) => {
            console.error(`Error sending role to player ${playerId}:`, error);
          });
        } else {
          console.error(`Interaction for player ${playerId} not found.`);
        }
      }

      if (gameState.mafias.length >= 2) {
        try {
          const mafiaThread = await channel.threads.create({
            name: `Mafia Chat - Game ${gameState.currentRound}`,
            autoArchiveDuration: 60,
            type: ChannelType.PrivateThread,
            invitable: false,
          });

          for (const mafiaId of gameState.mafias) {
            await mafiaThread.members.add(mafiaId).catch((error) => {
              console.error(`Error adding mafia member ${mafiaId} to thread:`, error);
            });
          }

          gameState.mafiaThread = mafiaThread;

          const mafiaMentions = gameState.mafias.map(id => `<@${id}>`).join(', ');

          await mafiaThread.send(`${mafiaMentions}\n💀 **هذا هو الشات الخاص بالمافيا. يمكنك مناقشة خططك هنا.**`);
        } catch (error) {
          console.error('Error creating mafia thread:', error);
          await channel.send('❌ **حدث خطأ أثناء إنشاء الشات الخاص بالمافيا.**');
        }
      }

      const embed = new EmbedBuilder()
        .setTitle('📋 **تقرير اللاعبين**')
        .setDescription('**تم توزيع الأدوار على اللاعبين. إليكم تفاصيل اللعبة:**')
        .setColor('#1E90FF')
        .addFields(
          { name: '👥 **عدد اللاعبين**', value: `${gameState.players.length}`, inline: true },
          { name: '💀 **عدد المافيا**', value: `${mafiaCount}`, inline: true },
          { name: '💉 **عدد الأطباء**', value: `1`, inline: true },
          { name: '🕵️‍♂️ **عدد المحققين**', value: `1`, inline: true },
          { name: '🛡️ **عدد الحراس الشخصيين**', value: `1`, inline: true },
          { name: '👑 **عدد العمدة**', value: `1`, inline: true },
          { name: '👨‍🌾 **عدد المواطنين**', value: `${gameState.players.length - mafiaCount - 4}`, inline: true },
          {
            name: 'جميع اللاعبين',
            value: gameState.allPlayers.map(id => `<@${id}>`).join(', ') || 'لا يوجد لاعبون حتى الآن.',
            inline: false
          }
        )
        .setFooter({ text: 'حظًا موفقًا للجميع!' })
        .setTimestamp();

      await channel.send({ embeds: [embed] });

      await channel.send('🚨 **تم الكشف عن الأدوار لجميع اللاعبين. ستبدأ اللعبة في 5 ثواني.**');

      const timeout = setTimeout(() => startMafiaPhase(channel), 5000);
      gameTimeouts.push(timeout);
    } catch (error) {
      console.error('Error in assignRoles:', error);
      await channel.send('❌ **حدث خطأ أثناء تعيين الأدوار.**');
    }
  }

  function resetGame() {
    if (gameState.gameMessage) {
      disableButtons(gameState.gameMessage);
    }

    if (gameState.mafiaThread) {
      try {
        gameState.mafiaThread.delete().catch((error) => {
          console.error('Error deleting mafia thread:', error);
        });
        gameState.mafiaThread = null;
      } catch (error) {
        console.error('Error deleting mafia thread:', error);
      }
    }

    gameState = {
      players: [],
      allPlayers: [],
      playerRoles: new Map(),
      mafias: [],
      doctor: null,
      detector: null,
      bodyguard: null,
      mayor: null,
      president: null,
      presidentUsedAbility: false,
      gameActive: false,
      protectedPlayer: null,
      shieldedPlayer: null,
      shieldedPlayerRound: null,
      killedPlayer: null,
      votes: new Map(),
      skipVotes: 0,
      totalVotes: 0,
      mafiaActions: new Map(),
      doctorActionTaken: false,
      doctorPhaseEnded: false,
      detectorUsedAbility: false,
      bodyguardUsedAbility: false,
      bodyguardPhaseEnded: false,
      gameMessage: null,
      mafiaMessages: new Map(),
      mafiaInteractions: new Map(),
      doctorInteraction: null,
      detectorInteraction: null,
      bodyguardInteraction: null,
      mayorInteraction: null,
      votePhaseActive: false,
      mafiaPhaseEnded: false,
      mafiaTimeout: null,
      currentRound: 0,
      mafiaThread: null,
    };

    interactions.clear();

    if (gameInterval) {
      clearInterval(gameInterval);
      gameInterval = null;
    }

    gameTimeouts.forEach((timeout) => clearTimeout(timeout));
    gameTimeouts = [];

    console.log('Game state has been reset.');
  }

  async function disableButtons(message) {
    if (!message) return;
    try {
      const fetchedMessage = await message.fetch().catch((error) => {
        if (error.code === 10008) {
          console.error('Message was deleted before it could be fetched.');
          return null;
        } else {
          throw error;
        }
      });

      if (!fetchedMessage) return;

      const disabledComponents = fetchedMessage.components.map((row) => {
        return new ActionRowBuilder().addComponents(
          row.components.map((button) =>
            ButtonBuilder.from(button).setDisabled(true)
          )
        );
      });

      await fetchedMessage.edit({ components: disabledComponents }).catch((error) => {
        console.error('Error editing message to disable buttons:', error);
      });
    } catch (error) {
      if (error.code === 10008) {
        console.error('Error: Tried to disable buttons on a message that no longer exists.');
      } else {
        console.error('Error while disabling buttons:', error);
      }
    }
  }

  async function disableButtonsInChannel(channel) {
    try {
      const messages = await channel.messages.fetch({ limit: 10 });
      for (const message of messages.values()) {
        if (message.components && message.components.length > 0) {
          await disableButtons(message).catch(error => {
            console.error('Error disabling buttons in channel:', error);
          });
        }
      }
    } catch (error) {
      console.error('Error fetching messages to disable buttons:', error);
    }
  }

  // Helper function to create button rows
  function createButtonRows(buttons) {
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
      rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, Math.min(i + 5, buttons.length))));
    }
    return rows;
  }

  // Game mechanics implementation
  async function startMafiaPhase(channel) {
    try {
      gameState.currentRound++;
      gameState.mafiaPhaseEnded = false;
      gameState.mafiaActions.clear();

      await channel.send(`💀 **الليل ${gameState.currentRound} - مرحلة المافيا**\n🌙 المافيا يختارون ضحيتهم...`);

      // Create buttons for mafia to choose victim
      const alivePlayers = gameState.players.filter(id => !gameState.mafias.includes(id));

      if (alivePlayers.length === 0) {
        await endGame(channel, 'mafia');
        return;
      }

      const buttons = alivePlayers.map(playerId =>
        new ButtonBuilder()
          .setCustomId(`kill_${playerId}`)
          .setLabel(`قتل ${channel.guild.members.cache.get(playerId)?.displayName || 'Unknown'}`)
          .setStyle(ButtonStyle.Danger)
      );

      const rows = createButtonRows(buttons);

      const embed = new EmbedBuilder()
        .setTitle('💀 مرحلة المافيا')
        .setDescription('المافيا، اختاروا من تريدون قتله:')
        .setColor('#8B0000')
        .addFields({
          name: 'اللاعبين الأحياء',
          value: alivePlayers.map(id => `<@${id}>`).join(', '),
          inline: false
        });

      // Send to mafia members
      for (const mafiaId of gameState.mafias) {
        try {
          const mafiaUser = await channel.guild.members.fetch(mafiaId);
          const dmChannel = await mafiaUser.createDM();

          const message = await dmChannel.send({
            embeds: [embed],
            components: rows
          });

          gameState.mafiaMessages.set(mafiaId, message);
        } catch (error) {
          console.error(`Error sending mafia phase to ${mafiaId}:`, error);
        }
      }

      // Set timeout for mafia phase
      const timeout = setTimeout(() => {
        if (!gameState.mafiaPhaseEnded) {
          resolveMafiaPhase(channel);
        }
      }, mafiaConfig.mafiaKillTime);

      gameTimeouts.push(timeout);

    } catch (error) {
      console.error('Error in startMafiaPhase:', error);
      await channel.send('❌ **حدث خطأ في مرحلة المافيا.**');
    }
  }

  async function handleMafiaKill(interaction) {
    try {
      if (!gameState.mafias.includes(interaction.user.id)) {
        await interaction.reply({
          content: '❌ **أنت لست من المافيا!**',
          ephemeral: true
        });
        return;
      }

      const targetId = interaction.customId.split('_')[1];

      // Record mafia vote
      gameState.mafiaActions.set(interaction.user.id, targetId);

      await interaction.reply({
        content: `✅ **لقد اخترت قتل <@${targetId}>**`,
        ephemeral: true
      });

      // Check if all mafia members have voted
      if (gameState.mafiaActions.size >= gameState.mafias.length) {
        await resolveMafiaPhase(interaction.channel || interaction.guild.channels.cache.find(ch => ch.name.includes('general')));
      }

    } catch (error) {
      console.error('Error in handleMafiaKill:', error);
      await interaction.reply({
        content: '❌ **حدث خطأ أثناء معالجة اختيارك.**',
        ephemeral: true
      });
    }
  }

  async function resolveMafiaPhase(channel) {
    try {
      gameState.mafiaPhaseEnded = true;

      // Disable mafia buttons
      for (const [mafiaId, message] of gameState.mafiaMessages) {
        try {
          await disableButtons(message);
        } catch (error) {
          console.error(`Error disabling buttons for mafia ${mafiaId}:`, error);
        }
      }

      let targetId = null;

      if (gameState.mafiaActions.size > 0) {
        // Count votes
        const votes = new Map();
        for (const vote of gameState.mafiaActions.values()) {
          votes.set(vote, (votes.get(vote) || 0) + 1);
        }

        // Get most voted target
        let maxVotes = 0;
        for (const [target, voteCount] of votes) {
          if (voteCount > maxVotes) {
            maxVotes = voteCount;
            targetId = target;
          }
        }
      }

      if (targetId) {
        gameState.killedPlayer = targetId;
        await channel.send(`💀 **المافيا اختاروا ضحيتهم: <@${targetId}>**`);
      } else {
        await channel.send('💀 **المافيا لم يتفقوا على ضحية.**');
      }

      // Start doctor phase
      await startDoctorPhase(channel);

    } catch (error) {
      console.error('Error in resolveMafiaPhase:', error);
      await channel.send('❌ **حدث خطأ أثناء حل مرحلة المافيا.**');
    }
  }

  async function handleDoctorProtect(interaction) {
    try {
      if (interaction.user.id !== gameState.doctor) {
        await interaction.reply({
          content: '❌ **أنت لست الطبيب!**',
          ephemeral: true
        });
        return;
      }

      const targetId = interaction.customId.split('_')[1];
      gameState.protectedPlayer = targetId;
      gameState.doctorPhaseEnded = true;

      await interaction.reply({
        content: `✅ **لقد اخترت حماية <@${targetId}>**`,
        ephemeral: true
      });

      await disableButtons(gameState.doctorInteraction);

      // Find the channel and continue to next phase
      const channel = interaction.guild.channels.cache.find(ch => ch.name.includes('general'));
      await resolveNightPhase(channel);

    } catch (error) {
      console.error('Error in handleDoctorProtect:', error);
      await interaction.reply({
        content: '❌ **حدث خطأ أثناء معالجة اختيارك.**',
        ephemeral: true
      });
    }
  }

  async function handleDetectorDetect(interaction) {
    // Implementation would go here
  }

  async function handleDetectorSkip(interaction) {
    // Implementation would go here
  }

  async function handleBodyguardShield(interaction) {
    // Implementation would go here
  }

  async function handleBodyguardSkip(interaction) {
    // Implementation would go here
  }

  async function handleVote(interaction) {
    try {
      if (!gameState.votePhaseActive) {
        await interaction.reply({
          content: '❌ **مرحلة التصويت غير نشطة.**',
          ephemeral: true
        });
        return;
      }

      if (!gameState.players.includes(interaction.user.id)) {
        await interaction.reply({
          content: '❌ **أنت لست في اللعبة أو تم طردك.**',
          ephemeral: true
        });
        return;
      }

      const targetId = interaction.customId.split('_')[1];

      // Record vote (mayor gets double vote)
      const voteWeight = gameState.mayor === interaction.user.id ? 2 : 1;
      gameState.votes.set(interaction.user.id, { target: targetId, weight: voteWeight });
      gameState.totalVotes++;

      await interaction.reply({
        content: `✅ **لقد صوت ضد <@${targetId}>** ${voteWeight > 1 ? '(صوت مضاعف - عمدة)' : ''}`,
        ephemeral: true
      });

      // Check if all players have voted
      if (gameState.totalVotes >= gameState.players.length) {
        const channel = interaction.channel || interaction.guild.channels.cache.find(ch => ch.name.includes('general'));
        await tallyVotes(channel, interaction.message);
      }

    } catch (error) {
      console.error('Error in handleVote:', error);
      await interaction.reply({
        content: '❌ **حدث خطأ أثناء معالجة صوتك.**',
        ephemeral: true
      });
    }
  }

  async function handleSkipVote(interaction) {
    try {
      if (!gameState.votePhaseActive) {
        await interaction.reply({
          content: '❌ **مرحلة التصويت غير نشطة.**',
          ephemeral: true
        });
        return;
      }

      if (!gameState.players.includes(interaction.user.id)) {
        await interaction.reply({
          content: '❌ **أنت لست في اللعبة أو تم طردك.**',
          ephemeral: true
        });
        return;
      }

      gameState.skipVotes++;
      gameState.totalVotes++;

      await interaction.reply({
        content: '✅ **لقد اخترت تخطي التصويت.**',
        ephemeral: true
      });

      // Check if all players have voted
      if (gameState.totalVotes >= gameState.players.length) {
        const channel = interaction.channel || interaction.guild.channels.cache.find(ch => ch.name.includes('general'));
        await tallyVotes(channel, interaction.message);
      }

    } catch (error) {
      console.error('Error in handleSkipVote:', error);
      await interaction.reply({
        content: '❌ **حدث خطأ أثناء معالجة اختيارك.**',
        ephemeral: true
      });
    }
  }

  async function handlePresidentAbility(interaction) {
    // Implementation would go here
  }

  async function handlePresidentSelection(interaction) {
    // Implementation would go here
  }

  async function tallyVotes(channel, voteMessage) {
    try {
      gameState.votePhaseActive = false;

      if (voteMessage) {
        await disableButtons(voteMessage);
      }

      // Count votes
      const voteCounts = new Map();
      for (const vote of gameState.votes.values()) {
        const current = voteCounts.get(vote.target) || 0;
        voteCounts.set(vote.target, current + vote.weight);
      }

      let eliminatedPlayer = null;
      let maxVotes = 0;
      let tiedPlayers = [];

      // Find player with most votes
      for (const [playerId, voteCount] of voteCounts) {
        if (voteCount > maxVotes) {
          maxVotes = voteCount;
          eliminatedPlayer = playerId;
          tiedPlayers = [playerId];
        } else if (voteCount === maxVotes && maxVotes > 0) {
          tiedPlayers.push(playerId);
        }
      }

      let resultMessage = '';

      if (tiedPlayers.length > 1) {
        resultMessage = `🤝 **تعادل في الأصوات! لم يتم طرد أحد.**\nالمتعادلون: ${tiedPlayers.map(id => `<@${id}>`).join(', ')}`;
      } else if (eliminatedPlayer && maxVotes > gameState.skipVotes) {
        // Remove eliminated player
        gameState.players = gameState.players.filter(id => id !== eliminatedPlayer);
        resultMessage = `🗳️ **تم طرد <@${eliminatedPlayer}> بـ ${maxVotes} صوت!**\n💀 **دوره كان: ${gameState.playerRoles.get(eliminatedPlayer)}**`;

        // Record loss for eliminated player
        await pointsManager.recordLoss(eliminatedPlayer);
      } else {
        resultMessage = '🤝 **لم يحصل أحد على أصوات كافية. لم يتم طرد أحد.**';
      }

      await channel.send(resultMessage);

      // Check win conditions
      const gameResult = checkWinConditions();
      if (gameResult) {
        await endGame(channel, gameResult);
        return;
      }

      // Continue to next night
      await channel.send('🌙 **حل الظلام... بدء ليلة جديدة.**');

      // Wait a bit then start next mafia phase
      const timeout = setTimeout(() => startMafiaPhase(channel), 3000);
      gameTimeouts.push(timeout);

    } catch (error) {
      console.error('Error in tallyVotes:', error);
      await channel.send('❌ **حدث خطأ أثناء فرز الأصوات.**');
    }
  }

  function checkWinConditions() {
    try {
      const aliveMafia = gameState.mafias.filter(id => gameState.players.includes(id));
      const aliveCitizens = gameState.players.filter(id => !gameState.mafias.includes(id));

      // Mafia wins if they equal or outnumber citizens
      if (aliveMafia.length >= aliveCitizens.length) {
        return 'mafia';
      }

      // Citizens win if all mafia are eliminated
      if (aliveMafia.length === 0) {
        return 'citizens';
      }

      return null; // Game continues
    } catch (error) {
      console.error('Error in checkWinConditions:', error);
      return null;
    }
  }

  async function endGame(channel, winner) {
    try {
      gameState.gameActive = false;

      let winMessage = '';
      let winnerIds = [];

      if (winner === 'mafia') {
        winMessage = '💀 **المافيا فازت!** 🎉';
        winnerIds = gameState.mafias.filter(id => gameState.allPlayers.includes(id));
      } else if (winner === 'citizens') {
        winMessage = '👥 **المواطنون فازوا!** 🎉';
        winnerIds = gameState.allPlayers.filter(id => !gameState.mafias.includes(id));
      }

      // Award points to winners and record losses for losers
      let pointsMessage = '';
      if (winnerIds.length > 0) {
        let winnerPoints = [];
        for (const winnerId of winnerIds) {
          const newPoints = await pointsManager.awardWin(winnerId);
          winnerPoints.push(`<@${winnerId}>: ${newPoints}`);
        }

        // Record losses for losers
        const loserIds = gameState.allPlayers.filter(id => !winnerIds.includes(id));
        for (const loserId of loserIds) {
          await pointsManager.recordLoss(loserId);
        }

        pointsMessage = `\n\n🏆 **تم منح نقطة واحدة لكل فائز!**\n${winnerPoints.join(', ')}`;
      }

      const embed = new EmbedBuilder()
        .setTitle('🎮 انتهت لعبة المافيا!')
        .setDescription(winMessage)
        .setColor(winner === 'mafia' ? '#8B0000' : '#00FF00')
        .addFields(
          {
            name: '💀 المافيا',
            value: gameState.mafias.map(id => `<@${id}>`).join(', '),
            inline: false
          },
          {
            name: '👥 المواطنون',
            value: gameState.allPlayers.filter(id => !gameState.mafias.includes(id)).map(id => `<@${id}>`).join(', '),
            inline: false
          },
          {
            name: '🏆 الفائزون',
            value: winnerIds.map(id => `<@${id}>`).join(', '),
            inline: false
          }
        );

      await channel.send({
        embeds: [embed],
        content: pointsMessage
      });

      // Clean up
      await disableButtonsInChannel(channel);
      resetGame();

    } catch (error) {
      console.error('Error in endGame:', error);
      await channel.send('❌ **حدث خطأ أثناء إنهاء اللعبة.**');
      resetGame();
    }
  }

  function getAlivePlayers() {
    if (gameState.players.length === 0) return 'لا يوجد أحياء.';
    return gameState.players.map((id) => `<@${id}>`).join(', ');
  }

  async function resolveNightPhase(channel) {
    try {
      await channel.send('🌅 **انتهت الليلة... يتم حل الأحداث...**');

      let deathMessage = '';

      if (gameState.killedPlayer) {
        // Check if killed player was protected
        if (gameState.protectedPlayer === gameState.killedPlayer) {
          deathMessage = `💊 **الطبيب نجح في حماية <@${gameState.killedPlayer}>!**`;
        } else {
          // Remove killed player
          gameState.players = gameState.players.filter(id => id !== gameState.killedPlayer);
          deathMessage = `💀 **<@${gameState.killedPlayer}> تم قتله بواسطة المافيا!**`;

          // Record loss for killed player
          await pointsManager.recordLoss(gameState.killedPlayer);
        }
      } else {
        deathMessage = '🌙 **لم يمت أحد هذه الليلة.**';
      }

      await channel.send(deathMessage);

      // Check win conditions
      const gameResult = checkWinConditions();
      if (gameResult) {
        await endGame(channel, gameResult);
        return;
      }

      // Reset night phase variables
      gameState.killedPlayer = null;
      gameState.protectedPlayer = null;
      gameState.doctorPhaseEnded = false;

      // Start voting phase
      await startVotePhase(channel);

    } catch (error) {
      console.error('Error in resolveNightPhase:', error);
      await channel.send('❌ **حدث خطأ أثناء حل أحداث الليل.**');
    }
  }

  async function startDoctorPhase(channel) {
    try {
      if (!gameState.doctor || !gameState.players.includes(gameState.doctor)) {
        await resolveNightPhase(channel);
        return;
      }

      await channel.send('🩺 **مرحلة الطبيب - الطبيب يختار من يحمي...**');

      const buttons = gameState.players.map(playerId =>
        new ButtonBuilder()
          .setCustomId(`protect_${playerId}`)
          .setLabel(`حماية ${channel.guild.members.cache.get(playerId)?.displayName || 'Unknown'}`)
          .setStyle(ButtonStyle.Success)
      );

      const rows = createButtonRows(buttons);

      const embed = new EmbedBuilder()
        .setTitle('🩺 مرحلة الطبيب')
        .setDescription('اختر من تريد حمايته من القتل:')
        .setColor('#00FF00');

      try {
        const doctorUser = await channel.guild.members.fetch(gameState.doctor);
        const dmChannel = await doctorUser.createDM();

        gameState.doctorInteraction = await dmChannel.send({
          embeds: [embed],
          components: rows
        });
      } catch (error) {
        console.error('Error sending doctor phase:', error);
        await resolveNightPhase(channel);
        return;
      }

      // Set timeout for doctor phase
      const timeout = setTimeout(() => {
        if (!gameState.doctorPhaseEnded) {
          gameState.doctorPhaseEnded = true;
          resolveNightPhase(channel);
        }
      }, mafiaConfig.docActionTime);

      gameTimeouts.push(timeout);

    } catch (error) {
      console.error('Error in startDoctorPhase:', error);
      await resolveNightPhase(channel);
    }
  }

  async function startBodyguardPhase(channel) {
    // Implementation would go here
  }

  async function startDetectorPhase(channel) {
    // Implementation would go here
  }

  async function startVotePhase(channel) {
    try {
      gameState.votePhaseActive = true;
      gameState.votes.clear();
      gameState.skipVotes = 0;
      gameState.totalVotes = 0;

      await channel.send(`☀️ **النهار ${gameState.currentRound} - مرحلة التصويت**\n👥 المواطنون يصوتون لطرد أحد المشتبه بهم...`);

      const buttons = gameState.players.map(playerId =>
        new ButtonBuilder()
          .setCustomId(`vote_${playerId}`)
          .setLabel(`صوت ضد ${channel.guild.members.cache.get(playerId)?.displayName || 'Unknown'}`)
          .setStyle(ButtonStyle.Primary)
      );

      // Add skip vote button
      buttons.push(
        new ButtonBuilder()
          .setCustomId('skip_vote')
          .setLabel('تخطي التصويت')
          .setStyle(ButtonStyle.Secondary)
      );

      const rows = createButtonRows(buttons);

      const embed = new EmbedBuilder()
        .setTitle('🗳️ مرحلة التصويت')
        .setDescription('صوتوا لطرد أحد المشتبه بهم:')
        .setColor('#FFD700')
        .addFields({
          name: 'اللاعبين الأحياء',
          value: gameState.players.map(id => `<@${id}>`).join(', '),
          inline: false
        });

      const voteMessage = await channel.send({
        embeds: [embed],
        components: rows
      });

      // Set timeout for voting phase
      const timeout = setTimeout(() => {
        if (gameState.votePhaseActive) {
          tallyVotes(channel, voteMessage);
        }
      }, mafiaConfig.citizenVoteTime);

      gameTimeouts.push(timeout);

    } catch (error) {
      console.error('Error in startVotePhase:', error);
      await channel.send('❌ **حدث خطأ في مرحلة التصويت.**');
    }
  }

  module.exports = {
    handleMafiaGame,
    setupMafiaInteractions,
    resetGame,
    isGameActive: () => gameState.gameActive
  };
