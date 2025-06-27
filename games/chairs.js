/// ThailandCodes|loqmanas ©
const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Collection,
  } = require("discord.js");
  const config = require("../config.js");
  const { pointsManager } = require("../points.js");
  /// ThailandCodes|loqmanas ©

  const GAME_DURATION = config.chairs.gameDuration;
  const ROUND_DURATION = config.chairs.roundDuration;
  const PREPARATION_TIME = config.chairs.preparationTime;
  const TIMER_UPDATE_INTERVAL = config.chairs.timerUpdateInterval;
  const HYPE_MESSAGES = [
    "🔥 | حماس! حماس! من سيفوز بالكرسي؟",
    "⚡ | السرعة مطلوبة! كن أسرع من البرق!",
    "💫 | الجولة حامية! من سيكون الأسرع؟",
    "🌟 | لحظات مثيرة! استعدوا للتحدي!",
    "🎯 | ركز جيداً! الفرصة لا تأتي مرتين!",
  ];

  const MAX_PLAYERS = config.chairs.maxPlayers;

  async function handleChairsGame(message) {
    const existingGame = message.client.games.get(message.channelId);
    if (existingGame && existingGame.active) {
      await message.reply("**❌ | توجد لعبة نشطة بالفعل في هذه القناة!**");
      return;
    }

    const game = {
      players: new Collection(),
      round: 0,
      message: null,
      active: true,
      timeout: null,
    };

    const embed = new EmbedBuilder()
      .setTitle("👑 لعبة الكراسي الموسيقية | Musical Chairs")
      .setDescription(
        `
          **🎮 | شرح اللعبة**
          > 🪑 سيتم إنشاء أزرار بعدد اللاعبين ناقص واحد
          > ⏱️ لديك 20 ثانية للضغط على زر لحجز كرسي
          > ❌ من لا يجد كرسياً يخرج من اللعبة
          > ⚠️ في بعض الجولات قد تظهر تحذيرات خاصة!
          > 👥 الحد الأقصى للاعبين: ${MAX_PLAYERS}

          **👥 | اللاعبين المشاركين (0/${MAX_PLAYERS})**
          > لا يوجد لاعبين حالياً
        `
      )
      .setColor(config.chairs.embedColor)
      .setFooter({
        text: `⏳ الوقت المتبقي: ${Math.floor(GAME_DURATION / 1000)} ثانية`
      });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("join")
        .setLabel("دخول")
        .setEmoji("🎮")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("leave")
        .setLabel("خروج")
        .setEmoji("🚪")
        .setStyle(ButtonStyle.Danger)
    );

    const gameMessage = await message.channel.send({
      embeds: [embed],
      components: [row],
    });

    game.message = gameMessage;
    message.client.games.set(message.channelId, game);

    const interval = setInterval(() => {
      const timeLeft = Math.max(
        0,
        GAME_DURATION - (Date.now() - gameMessage.createdTimestamp)
      );

      if (timeLeft === 0) {
        clearInterval(interval);
        row.components.forEach((button) => button.setDisabled(true));
        gameMessage.edit({ components: [row] });
        startGame(message.channel, game);
        return;
      }
  /// ThailandCodes|loqmanas ©

      embed.setFooter({
        text: `⏳ الوقت المتبقي: ${Math.floor(timeLeft / 1000)} ثانية`
      });
      gameMessage.edit({ embeds: [embed] });
    }, TIMER_UPDATE_INTERVAL);

    const collector = gameMessage.createMessageComponentCollector({
      time: GAME_DURATION,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.customId === "join") {
        if (game.players.size >= MAX_PLAYERS) {
          await interaction.reply({
            content: "**❌ | عذراً، اللعبة ممتلئة!**",
            ephemeral: true,
          });
          return;
        }

        if (!game.players.has(interaction.user.id)) {
          game.players.set(interaction.user.id, interaction.user);
          const playersList =
            game.players.size > 0
              ? [...game.players.values()]
                  .map((p) => `> 👤 ${p.toString()}`)
                  .join("\n")
              : "> لا يوجد لاعبين حالياً";

          embed.setDescription(`
              **🎮 | شرح اللعبة**
              > 🪑 سيتم إنشاء أزرار بعدد اللاعبين ناقص واحد
              > ⏱️ لديك 20 ثانية للضغط على زر لحجز كرسي
              > ❌ من لا يجد كرسياً يخرج من اللعبة
              > ⚠️ في بعض الجولات قد تظهر تحذيرات خاصة!
              > 👥 الحد الأقصى للاعبين: ${MAX_PLAYERS}

              **👥 | اللاعبين المشاركين (${game.players.size}/${MAX_PLAYERS})**
              ${playersList}
            `);
          await interaction.reply({
            content: "**✅ | تم انضمامك للعبة بنجاح**",
            ephemeral: true,
          });
          await gameMessage.edit({ embeds: [embed] });
        } else {
          await interaction.reply({
            content: "**❌ | أنت منضم للعبة بالفعل**",
            ephemeral: true,
          });
        }
      } else if (interaction.customId === "leave") {
        if (game.players.has(interaction.user.id)) {
          game.players.delete(interaction.user.id);
          const playersList =
            game.players.size > 0
              ? [...game.players.values()]
                  .map((p) => `> 👤 ${p.toString()}`)
                  .join("\n")
              : "> لا يوجد لاعبين حالياً";

          embed.setDescription(`
              **🎮 | شرح اللعبة**
              > 🪑 سيتم إنشاء أزرار بعدد اللاعبين ناقص واحد
              > ⏱️ لديك 20 ثانية للضغط على زر لحجز كرسي
              > ❌ من لا يجد كرسياً يخرج من اللعبة
              > ⚠️ في بعض الجولات قد تظهر تحذيرات خاصة!
              > 👥 الحد الأقصى للاعبين: ${MAX_PLAYERS}

              **👥 | اللاعبين المشاركين (${game.players.size}/${MAX_PLAYERS})**
              ${playersList}
            `);
          await interaction.reply({
            content: "**🚪 | تم خروجك من اللعبة**",
            ephemeral: true,
          });
          await gameMessage.edit({ embeds: [embed] });
        } else {
          await interaction.reply({
            content: "**❌ | أنت غير منضم للعبة**",
            ephemeral: true,
          });
        }
      }
    });
  }

  async function startGame(channel, game) {
    if (game.players.size < 2) {
      await channel.send({
        content: "**❌ | لا يمكن بدء اللعبة - عدد اللاعبين غير كافي**"
      });
      game.active = false;
      return;
    }
  /// ThailandCodes|loqmanas ©

    await channel.send({
      content: "**🎮 | جارٍ تجهيز الأدوار**"
    });

    setTimeout(async () => {
      await startRound(channel, game);
    }, PREPARATION_TIME);
  }

  async function startRound(channel, game) {
    game.round++;
    const availableChairs = game.players.size - 1;
    const buttons = [];
    const takenChairs = new Set();
  /// ThailandCodes|loqmanas ©

    const hypeMessage =
      HYPE_MESSAGES[Math.floor(Math.random() * HYPE_MESSAGES.length)];
    await channel.send({
      content: hypeMessage
    });

    const showWarning = Math.random() < 0.3;
    if (showWarning) {
      await channel.send({
        content: "**⚠️ | تحذير: لا تضغط على الزر!**"
      });
    }

    for (let i = 0; i < availableChairs; i++) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`chair_${i}`)
          .setLabel("🪑")
          .setStyle(showWarning ? ButtonStyle.Danger : ButtonStyle.Primary)
      );
    }

    for (let i = buttons.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [buttons[i], buttons[j]] = [buttons[j], buttons[i]];
    }

    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
      rows.push(
        new ActionRowBuilder().addComponents(
          buttons.slice(i, Math.min(i + 5, buttons.length))
        )
      );
    }

    const roundMessage = await channel.send({
      content: `**🎮 | الجولة ${game.round}**\n**⚡ | اختر كرسياً بسرعة!**`,
      components: rows,
    });

    const collector = roundMessage.createMessageComponentCollector({
      time: ROUND_DURATION,
    });

    const warningVictims = new Set();

    collector.on("collect", async (interaction) => {
      if (!game.players.has(interaction.user.id)) {
        await interaction.reply({
          content: "**❌ | أنت لست من المشاركين في اللعبة!**",
          ephemeral: true,
        });
        return;
      }

      if (showWarning) {
        warningVictims.add(interaction.user);
        game.players.delete(interaction.user.id);
        await interaction.reply({
          content: "**💥 | خسرت! لقد ضغطت على الزر رغم التحذير!**",
          ephemeral: true,
        });
        return;
      }

      if (takenChairs.has(interaction.customId)) {
        await interaction.reply({
          content: "**❌ | هذا الكرسي محجوز بالفعل!**",
          ephemeral: true,
        });
        return;
      }

      takenChairs.add(interaction.customId);
      await interaction.reply({
        content: "**✅ | تم حجز كرسي بنجاح!**",
        ephemeral: true,
      });
  /// ThailandCodes|loqmanas ©

      const button = buttons.find(
        (b) => b.data.custom_id === interaction.customId
      );
      button.setDisabled(true).setStyle(ButtonStyle.Success);
      await roundMessage.edit({ components: rows });

      if (takenChairs.size === availableChairs) {
        collector.stop();
      }
    });

    collector.on("end", async () => {
      if (showWarning && warningVictims.size > 0) {
        const victimsList = [...warningVictims]
          .map((player) => player.toString())
          .join("، ");
        await channel.send({
          content: `**💥 | تم طرد اللاعبين التاليين لضغطهم على الزر المحذر: ${victimsList}**`
        });
      }

      if (!showWarning) {
        const remainingPlayers = new Set(game.players.keys());
        const chairTakers = new Set();

        for (const takenChair of takenChairs) {
          const interactions = collector.collected.filter(
            (i) => i.customId === takenChair
          );
          if (interactions.size > 0) {
            chairTakers.add(interactions.first().user.id);
          }
        }

        const noChairPlayers = [...remainingPlayers].filter(
          (playerId) => !chairTakers.has(playerId)
        );

        if (noChairPlayers.length > 0) {
          const eliminatedList = noChairPlayers
            .map((playerId) => game.players.get(playerId).toString())
            .join("، ");
          for (const playerId of noChairPlayers) {
            game.players.delete(playerId);
          }
          await channel.send({
            content: `**❌ | تم طرد اللاعبين التاليين لعدم حجز كرسي: ${eliminatedList}**`
          });
        }
      }
  /// ThailandCodes|loqmanas ©

      if (game.players.size <= 1) {
        if (game.players.size === 1) {
          const winner = game.players.first();

          // Award points to the winner
          const newPoints = await pointsManager.awardWin(winner.id);

          await channel.send({
            content: `**🎉 | مبروك ${winner}! لقد فزت باللعبة**\n\n🏆 **تم منح نقطة واحدة للفائز! النقاط الحالية: ${newPoints}**`
          });
        } else {
          await channel.send({
            content: "**😔 | انتهت اللعبة بدون فائز**"
          });
        }
        game.active = false;
      } else {
        setTimeout(() => startRound(channel, game), PREPARATION_TIME);
      }
    });
  }
  /// ThailandCodes|loqmanas ©

  module.exports = { handleChairsGame };
