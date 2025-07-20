require('dotenv').config();
const {
  Client,
  IntentsBitField,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  REST,
  Routes,
  ActionRowBuilder,
  InteractionType,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');
const {
  createButtonRows,
  commands,
  sleep,
} = require('./utils.js');
// Load configuration from both config.js and config.json
const {
  roulette: { startTime, chooseTimeout, timeBetweenRounds },
  token,
} = require('./config.js');

// Load allowedRoleIds from config.json
const { allowedRoleIds } = require('./config.json');
const { createWheel } = require('./wheel.js');
const { pointsManager, ABILITY_COST } = require('./points.js');

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

const Games = new Map();
const KickedPlayers = new Map();
const AllPlayers = new Map();

// Counting Game Configuration
const COUNTING_CHANNEL_ID = "1386926777120850053"; // Replace with your channel ID
const fs = require('fs');
const path = require('path');

// File to store counting data
const COUNTING_DATA_FILE = path.join(__dirname, 'counting_data.json');

// Load counting data from file
function loadCountingData() {
  try {
    if (fs.existsSync(COUNTING_DATA_FILE)) {
      const data = fs.readFileSync(COUNTING_DATA_FILE, 'utf8');
      const parsed = JSON.parse(data);
      return parsed.currentCount || 0;
    }
  } catch (error) {
    console.error('Error loading counting data:', error);
  }
  return 0; // Default to 0 if file doesn't exist or error occurs (next expected will be 1)
}

// Save counting data to file
function saveCountingData(count) {
  try {
    const data = { currentCount: count };
    fs.writeFileSync(COUNTING_DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving counting data:', error);
  }
}

// Initialize current count from saved data
let currentCount = loadCountingData();

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

client.on('ready', async () => {
  const rest = new REST().setToken(token);

  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);
    const data = await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error('Error refreshing application commands:', error);
  }

  console.log(`
    ██╗    ██╗██╗ ██████╗██╗  ██╗    ███████╗████████╗██╗   ██╗██████╗ ██╗ ██████╗
    ██║    ██║██║██╔════╝██║ ██╔╝    ██╔════╝╚══██╔══╝██║   ██║██╔══██╗██║██╔═══██╗
    ██║ █╗ ██║██║██║     █████╔╝     ███████╗   ██║   ██║   ██║██║  ██║██║██║   ██║
    ██║███╗██║██║██║     ██╔═██╗     ╚════██║   ██║   ██║   ██║██║  ██║██║██║   ██║
    ╚███╔███╔╝██║╚██████╗██║  ██╗    ███████║   ██║   ╚██████╔╝██████╔╝██║╚██████╔╝
     ╚══╝╚══╝ ╚═╝ ╚═════╝╚═╝  ╚═╝    ╚══════╝   ╚═╝    ╚═════╝ ╚═════╝ ╚═╝ ╚═════╝
    `);
  console.log('I am ready!');
  console.log('Bot By Wick Studio');
  console.log('discord.gg/wicks');
  console.log(`🔢 Counting game loaded - Current count: ${currentCount}, Next expected: ${currentCount + 1}`);
});

// Load unified configuration
const config = require('./config.js');

// Import game handlers
const { handleChairsGame } = require('./games/chairs.js');
const { handleMafiaGame, setupMafiaInteractions } = require('./games/mafia.js');
const { handleSpyGame, setupSpyInteractions, handleVoteCommand } = require('./games/spy.js');
const { handleButtonGame } = require('./games/button.js');
const { handleQuizCommand } = require('./games/quiz.js');

// Initialize client.games collection for chairs game
client.games = new Map();

// Setup game interactions - DISABLED to prevent duplicate event listeners
// setupMafiaInteractions(client);
// setupSpyInteractions(client);

// Create help command handler
async function handleHelpCommand(message) {
  const helpEmbed = new EmbedBuilder()
    .setTitle('🎮 قائمة الألعاب المتاحة')
    .setColor('#3498db')
    .setDescription('مرحبًا بك في بوت الألعاب! إليك قائمة بالألعاب المتاحة وكيفية استخدامها:')
    .addFields(
      {
        name: `🎲 ${config.roulette.commandName}`,
        value: `استخدم الأمر \`${config.prefix}${config.roulette.commandName}\` لبدء لعبة الروليت. يتنافس اللاعبون للبقاء حتى النهاية.`
      },
      {
        name: `🪑 ${config.chairs.commandName}`,
        value: `استخدم الأمر \`${config.prefix}${config.chairs.commandName}\` لبدء لعبة الكراسي الموسيقية. اضغط بسرعة لتأمين كرسي!`
      },
      {
        name: `🕵️ ${config.mafia.commandName} ⚠️ معطلة مؤقتاً`,
        value: `~~استخدم الأمر \`${config.prefix}${config.mafia.commandName}\` لبدء لعبة المافيا.~~ **معطلة للصيانة**`
      },
      {
        name: `🔎 ${config.spy.commandName} ⚠️ معطلة مؤقتاً`,
        value: `~~استخدم الأمر \`${config.prefix}${config.spy.commandName}\` لبدء لعبة من الجاسوس.~~ **معطلة للصيانة**`
      },
      {
        name: `🎯 ${config.button.commandName}`,
        value: `استخدم الأمر \`${config.prefix}${config.button.commandName}\` لبدء لعبة الزر. اضغط على الزر الأخضر بسرعة للفوز!`
      },
      {
        name: '🧩 ألعاب الكويز ⚠️ معطلة مؤقتاً',
        value: `~~\`${config.prefix}اسرع\` - لعبة الأسرع~~\n~~\`${config.prefix}دين\` - لعبة الدين~~\n~~\`${config.prefix}اعلام\` - لعبة الأعلام~~\n~~\`${config.prefix}شخصية\` - لعبة الشخصيات~~\n~~\`${config.prefix}ترجم\` - لعبة الترجمة~~\n~~\`${config.prefix}عواصم\` - لعبة العواصم~~\n~~\`${config.prefix}تمويه\` - لعبة التمويه~~\n~~\`${config.prefix}رتب\` - لعبة ترتيب الكلمات~~\n~~\`${config.prefix}براند\` - لعبة العلامات التجارية~~\n**جميع ألعاب الكويز معطلة للصيانة**`
      },
      {
        name: '💰 نظام النقاط',
        value: `\`${config.prefix}نقاط\` / \`${config.prefix}points\` - عرض نقاطك\n\`${config.prefix}لوحة_النقاط\` / \`${config.prefix}ps\` - لوحة المتصدرين\n\`${config.prefix}احصائيات\` / \`${config.prefix}stats\` - إحصائياتك التفصيلية\n\`${config.prefix}اعطاء_نقاط\` / \`${config.prefix}give_points\` - إعطاء نقاط (للمشرفين)`
      },
      {
        name: '➕ أوامر إضافية',
        value: `~~\`${config.prefix}تصويت\` - التصويت في لعبة الجاسوس~~ **معطل مؤقتاً**\n\`${config.prefix}حالة\` / \`${config.prefix}status\` - حالة الألعاب النشطة`
      },
      {
        name: '🔢 لعبة العد',
        value: `في قناة العد المخصصة، اكتب الأرقام بالتسلسل بدءاً من 1\n✅ رقم صحيح | ❌ رقم خاطئ\nالعد يستمر حتى لو أخطأ أحد!\n\`${config.prefix}عد\` - عرض الرقم التالي المطلوب\n\`${config.prefix}ريست-عد\` - إعادة تعيين العداد (للمشرفين)`
      },
      {
        name: '🏆 كيفية كسب النقاط',
        value: `• اربح نقطة واحدة عند الفوز في أي لعبة\n• استخدم 3 نقاط لتفعيل قدرات الروليت\n• تتبع إحصائياتك ومعدل الفوز`
      },
      {
        name: '❓ مساعدة',
        value: `استخدم الأمر \`${config.prefix}مساعدة\` لعرض هذه القائمة مرة أخرى.`
      }
    )
    .setFooter({ text: 'استمتع بوقتك مع ألعابنا! 🎯' });

  await message.channel.send({ embeds: [helpEmbed] });
}

// Points command handlers
async function handlePointsCommand(message) {
  try {
    const userId = message.author.id;
    const points = await pointsManager.getPoints(userId);
    const abilitiesAvailable = Math.floor(points / ABILITY_COST);

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('💰 نقاطك الحالية')
      .setDescription(`🏆 **${points}** نقطة`)
      .setFooter({ text: 'اربح النقاط من خلال الفوز في الألعاب!' });

    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in handlePointsCommand:', error);
    message.reply('حدث خطأ أثناء عرض النقاط. / Error displaying points.').catch(console.error);
  }
}

async function handleLeaderboardCommand(message) {
  try {
    const leaderboard = pointsManager.getLeaderboard(15);

    if (leaderboard.length === 0) {
      await message.reply('لا توجد بيانات في لوحة المتصدرين حتى الآن.');
      return;
    }

    let leaderboardText = '**النقاط المستخدمين:**\n';

    for (let i = 0; i < leaderboard.length; i++) {
      const user = leaderboard[i];
      const member = await message.guild.members.fetch(user.userId).catch(() => null);
      const username = member ? member.displayName : `User ${user.userId}`;

      leaderboardText += `${i + 1}| @${username} **${user.points}**\n`;
    }

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setDescription(leaderboardText);

    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in handleLeaderboardCommand:', error);
    message.reply('حدث خطأ أثناء عرض لوحة المتصدرين.').catch(console.error);
  }
}

async function handleStatsCommand(message) {
  try {
    const userId = message.author.id;
    const points = await pointsManager.getPoints(userId);
    const stats = await pointsManager.getStats(userId);

    const embed = new EmbedBuilder()
      .setColor('#61607e')
      .setTitle('📊 إحصائياتك')
      .addFields(
        {
          name: '💰 النقاط',
          value: `${points} نقطة`,
          inline: true
        },
        {
          name: '🎮 الألعاب المُلعبة',
          value: `${stats.gamesPlayed}`,
          inline: true
        },
        {
          name: '🏆 الانتصارات',
          value: `${stats.wins}`,
          inline: true
        },
        {
          name: '💔 الهزائم',
          value: `${stats.losses}`,
          inline: true
        },
        {
          name: '📈 معدل الفوز',
          value: `${stats.winRate}%`,
          inline: true
        }
      )
      .setFooter({ text: 'استمر في اللعب لتحسين إحصائياتك!' });

    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in handleStatsCommand:', error);
    message.reply('حدث خطأ أثناء عرض الإحصائيات. / Error displaying statistics.').catch(console.error);
  }
}

async function handleGivePointsCommand(message) {
  try {
    // Check if user has permission to give points
    const hasPermission = allowedRoleIds.some(roleId => message.member.roles.cache.has(roleId));
    if (!hasPermission) {
      message.reply('❌ **ليس لديك الإذن لإعطاء النقاط.**').catch(console.error);
      return;
    }

    const args = message.content.split(' ');
    if (args.length < 3) {
      message.reply('❌ **الاستخدام الصحيح:**\n`-اعطاء_نقاط @user amount` أو `-give_points @user amount`').catch(console.error);
      return;
    }

    const mentionedUser = message.mentions.users.first();
    if (!mentionedUser) {
      message.reply('❌ **يجب أن تذكر مستخدماً.**').catch(console.error);
      return;
    }

    const amount = parseInt(args[2]);
    if (isNaN(amount) || amount <= 0) {
      message.reply('❌ **يجب أن يكون المبلغ رقماً موجباً.**').catch(console.error);
      return;
    }

    const newPoints = await pointsManager.addPoints(mentionedUser.id, amount);

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setDescription(`لقد تم إضافة النقاط بنجاح لـ <@${mentionedUser.id}> • الآن معك ${newPoints} نقطة فقط`);

    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in handleGivePointsCommand:', error);
    message.reply('حدث خطأ أثناء إعطاء النقاط. / Error giving points.').catch(console.error);
  }
}

// Create status command handler
async function handleStatusCommand(message) {
  // Check active games
  const activeRouletteGames = await Games.size;
  const activeChairsGames = Array.from(client.games.values()).filter(game => game.active).length;
  const activeMafiaGame = require('./games/mafia.js').isGameActive() ? 1 : 0;
  const activeSpyGame = require('./games/spy.js').isGameActive() ? 1 : 0;
  const activeButtonGame = require('./games/button.js').isGameActive() ? 1 : 0;

  const statusEmbed = new EmbedBuilder()
    .setTitle('📊 حالة الألعاب النشطة')
    .setColor('#3498db')
    .setDescription('إليك حالة جميع الألعاب النشطة حاليًا على الخادم:')
    .addFields(
      {
        name: `🎲 ${config.roulette.commandName}`,
        value: activeRouletteGames > 0 ?
          `نشطة: ${activeRouletteGames} لعبة` :
          'لا توجد ألعاب نشطة حاليًا',
        inline: true
      },
      {
        name: `🪑 ${config.chairs.commandName}`,
        value: activeChairsGames > 0 ?
          `نشطة: ${activeChairsGames} لعبة` :
          'لا توجد ألعاب نشطة حاليًا',
        inline: true
      },
      {
        name: `🕵️ ${config.mafia.commandName}`,
        value: '⚠️ معطلة مؤقتاً للصيانة',
        inline: true
      },
      {
        name: `🔎 ${config.spy.commandName}`,
        value: '⚠️ معطلة مؤقتاً للصيانة',
        inline: true
      },
      {
        name: `🎯 ${config.button.commandName}`,
        value: activeButtonGame > 0 ?
          `نشطة: ${activeButtonGame} لعبة` :
          'لا توجد ألعاب نشطة حاليًا',
        inline: true
      },
      {
        name: '🧩 ألعاب الكويز',
        value: '⚠️ معطلة مؤقتاً للصيانة',
        inline: true
      },
      {
        name: '🔢 لعبة العد',
        value: `العدد الحالي: ${currentCount}\nالعدد التالي المطلوب: ${currentCount + 1}`,
        inline: true
      }
    )
    .setFooter({ text: `تم التحديث في: ${new Date().toLocaleTimeString()}` })
    .setTimestamp();

  await message.channel.send({ embeds: [statusEmbed] });
}

// Counting Game Handler
async function handleCountingGame(message) {
  try {
    // Check if the message contains a number
    const messageContent = message.content.trim();
    const number = parseInt(messageContent);

    // If it's not a number, ignore it
    if (isNaN(number)) {
      return;
    }

    // More flexible number validation - allow numbers with spaces or other characters
    const extractedNumber = messageContent.match(/\d+/);
    if (!extractedNumber) {
      return;
    }

    const actualNumber = parseInt(extractedNumber[0]);
    const expectedNumber = currentCount + 1;

    console.log(`Counting: User sent "${messageContent}", extracted number: ${actualNumber}, expected: ${expectedNumber}`);

    if (actualNumber === expectedNumber) {
      // Correct number!
      currentCount = actualNumber;
      saveCountingData(currentCount); // Save to file

      // Try to react with retry logic
      let reactionSuccess = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await message.react('✅');
          console.log(`✅ Correct number ${actualNumber} by ${message.author.username} (attempt ${attempt})`);
          reactionSuccess = true;
          break;
        } catch (reactionError) {
          console.error(`Failed to add ✅ reaction (attempt ${attempt}):`, reactionError);
          if (attempt < 3) {
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      // If all reaction attempts failed, use fallback
      if (!reactionSuccess) {
        try {
          await message.author.send(`✅ **صحيح!** رقم ${actualNumber} في قناة العد`);
          console.log(`✅ Sent DM feedback for correct number ${actualNumber}`);
        } catch (dmError) {
          console.error('Failed to send DM feedback:', dmError);
          // Last resort: temporary reply that deletes quickly
          try {
            await message.reply(`✅ ${actualNumber}`).then(msg => {
              setTimeout(() => msg.delete().catch(() => {}), 2000);
            });
            console.log(`✅ Sent temporary reply for correct number ${actualNumber}`);
          } catch (replyError) {
            console.error('All feedback methods failed:', replyError);
          }
        }
      }
    } else {
      // Wrong number!
      let reactionSuccess = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await message.react('❌');
          console.log(`❌ Wrong number ${actualNumber} by ${message.author.username}, expected ${expectedNumber} (attempt ${attempt})`);
          reactionSuccess = true;
          break;
        } catch (reactionError) {
          console.error(`Failed to add ❌ reaction (attempt ${attempt}):`, reactionError);
          if (attempt < 3) {
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      // If all reaction attempts failed, use fallback
      if (!reactionSuccess) {
        try {
          await message.author.send(`❌ **خطأ!** كتبت ${actualNumber} والمطلوب ${expectedNumber} في قناة العد`);
          console.log(`❌ Sent DM feedback for wrong number ${actualNumber}`);
        } catch (dmError) {
          console.error('Failed to send DM feedback:', dmError);
          // Last resort: temporary reply that deletes quickly
          try {
            await message.reply(`❌ المطلوب: ${expectedNumber}`).then(msg => {
              setTimeout(() => msg.delete().catch(() => {}), 2000);
            });
            console.log(`❌ Sent temporary reply for wrong number ${actualNumber}`);
          } catch (replyError) {
            console.error('All feedback methods failed:', replyError);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in counting game:', error);
  }
}

client.on('messageCreate', async message => {
  try {
    if (message.author.bot) return;

    // Handle help command
    if (message.content === `${config.prefix}مساعدة` || message.content === `${config.prefix}help`) {
      await handleHelpCommand(message);
      return;
    }

    // Handle status command
    if (message.content === `${config.prefix}حالة` || message.content === `${config.prefix}status`) {
      await handleStatusCommand(message);
      return;
    }

    // Handle points commands
    if (message.content === `${config.prefix}نقاط` || message.content === `${config.prefix}points`) {
      await handlePointsCommand(message);
      return;
    }

    // Handle counting reset command (only for allowed roles)
    if (message.content === `${config.prefix}ريست-عد` || message.content === `${config.prefix}reset-count`) {
      const member = message.member;
      const hasPermission = allowedRoleIds.some(roleId => member.roles.cache.has(roleId));
      if (!hasPermission) {
        message.reply('❌ **ليس لديك الإذن لإعادة تعيين العداد.**').catch(console.error);
        return;
      }

      currentCount = 0;
      saveCountingData(currentCount);
      message.reply('🔢 **تم إعادة تعيين العداد! الرقم التالي المطلوب: 1**').catch(console.error);
      return;
    }

    // Handle counting status command
    if (message.content === `${config.prefix}عد` || message.content === `${config.prefix}count`) {
      const nextNumber = currentCount + 1;
      message.reply(`🔢 **العداد الحالي: ${currentCount}**\n📍 **الرقم التالي المطلوب: ${nextNumber}**`).catch(console.error);
      return;
    }

    // Handle leaderboard command
    if (message.content === `${config.prefix}لوحة_النقاط` || message.content === `${config.prefix}ps`) {
      await handleLeaderboardCommand(message);
      return;
    }

    // Handle stats command
    if (message.content === `${config.prefix}احصائيات` || message.content === `${config.prefix}stats`) {
      await handleStatsCommand(message);
      return;
    }

    // Handle give points command (role-restricted)
    if (message.content.startsWith(`${config.prefix}اعطاء_نقاط`) || message.content.startsWith(`${config.prefix}give_points`)) {
      await handleGivePointsCommand(message);
      return;
    }

    // Handle chairs game command
    if (message.content === `${config.prefix}${config.chairs.commandName}`) {
      // Add role check for chairs game
      // Check if user has any of the allowed roles
      const hasPermission = allowedRoleIds.some(roleId => message.member.roles.cache.has(roleId));
      if (!hasPermission) {
        message.reply('ليس لديك الإذن لاستخدام هذا الأمر.').catch(console.error);
        return;
      }
      await handleChairsGame(message);
      return;
    }

    // Handle mafia game command - TEMPORARILY DISABLED (NO RESPONSE)
    if (message.content === `${config.prefix}${config.mafia.commandName}`) {
      // Command disabled - bot will not respond
      return;
    }

    // ORIGINAL MAFIA CODE (COMMENTED OUT):
    // if (message.content === `${config.prefix}${config.mafia.commandName}`) {
    //   // Check if user has any of the allowed roles
    //   const hasMafiaPermission = allowedRoleIds.some(roleId => message.member.roles.cache.has(roleId));
    //   if (!hasMafiaPermission) {
    //     message.reply('❌ **ليس لديك الإذن لبدء اللعبة.**').catch(console.error);
    //     return;
    //   }
    //   await handleMafiaGame(message);
    //   return;
    // }

    // Handle spy game command - TEMPORARILY DISABLED (NO RESPONSE)
    if (message.content === `${config.prefix}${config.spy.commandName}`) {
      // Command disabled - bot will not respond
      return;
    }

    // Handle vote command for spy game - TEMPORARILY DISABLED
    if (message.content === `${config.prefix}تصويت`) {
      message.reply('⚠️ **أمر التصويت معطل مؤقتاً (مرتبط بلعبة الجاسوس).**').catch(console.error);
      return;
    }

    // ORIGINAL SPY GAME CODE (COMMENTED OUT):
    // if (message.content === `${config.prefix}${config.spy.commandName}`) {
    //   // Check if user has any of the allowed roles
    //   const hasSpyPermission = allowedRoleIds.some(roleId => message.member.roles.cache.has(roleId));
    //   if (!hasSpyPermission) {
    //     message.reply('❌ **ليس لديك الإذن لبدء اللعبة.**').catch(console.error);
    //     return;
    //   }
    //   await handleSpyGame(message);
    //   return;
    // }

    // ORIGINAL VOTE COMMAND CODE (COMMENTED OUT):
    // if (message.content === `${config.prefix}تصويت`) {
    //   // No permission check for voting - everyone can vote
    //   await handleVoteCommand(message);
    //   return;
    // }

    // Handle button game command
    if (message.content === `${config.prefix}${config.button.commandName}`) {
      // Check if user has any of the allowed roles
      const hasButtonPermission = allowedRoleIds.some(roleId => message.member.roles.cache.has(roleId));
      if (!hasButtonPermission) {
        message.reply('❌ **ليس لديك الإذن لبدء اللعبة.**').catch(console.error);
        return;
      }
      await handleButtonGame(message);
      return;
    }

    // Handle اسرع quiz game command - ENABLED
    if (message.content === `${config.prefix}اسرع`) {
      console.log(`🎮 اسرع command detected! User: ${message.author.username}, Command: "${message.content}"`);

      // Check if user has permission
      const hasPermission = allowedRoleIds.some(roleId => message.member.roles.cache.has(roleId));
      if (!hasPermission) {
        console.log(`❌ Permission denied for user: ${message.author.username}`);
        message.reply('❌ **ليس لديك الإذن لاستخدام هذا الأمر.**').catch(console.error);
        return;
      }

      console.log(`✅ Permission granted, calling handleQuizCommand with: "${message.content}"`);
      await handleQuizCommand(message, message.content);
      return;
    }

    // Handle other quiz game commands - TEMPORARILY DISABLED (NO RESPONSE)
    const disabledQuizCommands = ['دين', 'اعلام', 'شخصية', 'ترجم', 'عواصم', 'تمويه', 'رتب', 'براند'];
    for (const quizCommand of disabledQuizCommands) {
      if (message.content === `${config.prefix}${quizCommand}`) {
        // Command disabled - bot will not respond
        return;
      }
    }

    // ORIGINAL QUIZ COMMANDS CODE (COMMENTED OUT):
    // const quizCommands = ['اسرع', 'دين', 'اعلام', 'شخصية', 'ترجم', 'عواصم', 'تمويه', 'رتب', 'براند'];
    // for (const quizCommand of quizCommands) {
    //   if (message.content === `${config.prefix}${quizCommand}`) {
    //     await handleQuizCommand(message, message.content);
    //     return;
    //   }
    // }

    // Handle counting game
    if (message.channel.id === COUNTING_CHANNEL_ID) {
      await handleCountingGame(message);
      // Don't return here - let other commands still work in the counting channel
    }

    // Handle roulette game command
    if (message.content === `${config.prefix}${config.roulette.commandName}`) {
      // Check if user has any of the allowed roles
      const hasRoulettePermission = allowedRoleIds.some(roleId => message.member.roles.cache.has(roleId));
      if (!hasRoulettePermission) {
        message.reply('ليس لديك الإذن لاستخدام هذا الأمر.').catch(console.error);
        return;
      }

      if (await Games.get(message.guildId)) {
        message.reply('هناك لعبة قيد التقدم بالفعل في هذا السيرفر.').catch(console.error);
        return;
      }

      await startRouletteGame(message);
    }
  } catch (error) {
    console.error('Error handling message command:', error);
    message.reply('حدث خطأ أثناء معالجة الأمر. يرجى المحاولة مرة أخرى.').catch(console.error);
  }
});

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.type === InteractionType.ApplicationCommand) {
      if (interaction.commandName === 'roulette') {
        await startRouletteGame(interaction);
      }
    } else if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    if (!interaction.replied) {
      interaction
        .reply({ content: 'حدث خطأ أثناء معالجة التفاعل. يرجى المحاولة مرة أخرى.', flags: MessageFlags.Ephemeral })
        .catch(console.error);
    }
  }
});


async function startRouletteGame(source) {
  try {
    const member = source.member || source.guild.members.cache.get(source.author.id);
    const guildId = source.guildId || source.guild.id;

    // Check if user has any of the allowed roles
    const hasPermission = allowedRoleIds.some(roleId => member.roles.cache.has(roleId));
    if (!hasPermission) {
      if (source.reply) {
        source.reply({ content: 'ليس لديك الإذن لاستخدام هذا الأمر.', flags: MessageFlags.Ephemeral }).catch(console.error);
      } else {
        source.channel.send('ليس لديك الإذن لاستخدام هذا الأمر.').catch(console.error);
      }
      return;
    }

    if (await Games.get(guildId)) {
      if (source.reply) {
        source.reply({ content: 'هناك لعبة قيد التقدم بالفعل في هذا السيرفر.', flags: MessageFlags.Ephemeral }).catch(console.error);
      } else {
        source.channel.send('هناك لعبة قيد التقدم بالفعل في هذا السيرفر.').catch(console.error);
      }
      return;
    }

    const joinButton = new ButtonBuilder()
      .setCustomId('join_roulette')
      .setLabel('انضم إلى اللعبة')
      .setStyle(ButtonStyle.Success);

    const leaveButton = new ButtonBuilder()
      .setCustomId('leave_roulette')
      .setLabel('غادر اللعبة')
      .setStyle(ButtonStyle.Danger);

    const rows = createButtonRows([joinButton, leaveButton]);

    // Create an embed with game instructions in Arabic
    const gameEmbed = new EmbedBuilder()
      .setColor('#61607e')
      .setTitle('🎲 لعبة الروليت')
      .setDescription('مرحبًا بك في لعبة الروليت! هذه لعبة تفاعلية ممتعة حيث يتنافس اللاعبون للبقاء حتى النهاية.')
      .addFields(
        { name: '📋 كيفية اللعب', value: 'انقر على زر "انضم إلى اللعبة" أدناه للانضمام. سيتم تعيين رقم لك تلقائيًا.' },
        { name: '⏱️ وقت الانضمام', value: `لديك ${startTime} ثانية للانضمام قبل بدء اللعبة.` },
        { name: '🎯 هدف اللعبة', value: 'في كل جولة، سيتم اختيار لاعب عشوائيًا ليقوم بطرد لاعب آخر. كن آخر لاعب متبقي لتفوز!' },
        { name: '🛡️ قدرات خاصة', value: 'يمكنك استخدام قدرات خاصة مثل الحماية، الإحياء، التجميد، وتبديل الدور مرة واحدة خلال اللعبة.' },
        { name: '👥 عدد اللاعبين', value: '0/40 لاعبين انضموا' }
      )
      .setFooter({ text: 'انقر على "انضم إلى اللعبة" للمشاركة!' });

    const initialMessage = await source.channel.send({
      embeds: [gameEmbed],
      components: rows,
    });

    Games.set(guildId, {
      players: [],
      messageId: initialMessage.id,
      winner: {},
    });
    KickedPlayers.set(guildId, { players: [] });
    AllPlayers.set(guildId, new Map());

    if (source.reply) {
      source.reply({ content: 'تم بدء اللعبة! انضم عن طريق الضغط على الزر أدناه.', flags: MessageFlags.Ephemeral }).catch(console.error);
    } else {
      source.channel.send('تم بدء اللعبة! انضم عن طريق الضغط على الزر أدناه.').catch(console.error);
    }

    setTimeout(async () => {
      try {
        await initialMessage.edit({ components: [] }).catch(console.error);
        await startGame(source, true);
      } catch (error) {
        console.error('Error starting the game:', error);
      }
    }, startTime * 1000);
  } catch (error) {
    console.error('Error in startRouletteGame:', error);
    source.channel.send('حدث خطأ أثناء بدء اللعبة. يرجى المحاولة مرة أخرى.').catch(console.error);
  }
}


async function handleButtonInteraction(interaction) {
  try {
    const customId = interaction.customId;

    if (customId === 'join_roulette') {
      await handleJoinGame(interaction);
    } else if (customId === 'leave_roulette') {
      await handleLeaveGame(interaction);
    } else if (customId.startsWith('kick_')) {
      await handleKickPlayer(interaction);
    } else if (customId === 'auto_kick') {
      await handleAutoKick(interaction);
    } else if (customId === 'withdrawal') {
      await handleWithdrawal(interaction);
    } else if (customId.startsWith('revive_player')) {
      await handleReviveAction(interaction);
    } else if (customId.startsWith('protect_player')) {
      await handleProtectYourself(interaction);
    } else if (customId.startsWith('switch_turn')) {
      await handleSwitchTurn(interaction);
    } else if (customId.startsWith('freeze_player')) {
      await handleFreezeAction(interaction);
    } else if (customId.startsWith('select_player_')) {
      await handleSelectPlayer(interaction);
    } else if (customId.startsWith('paginate_')) {
      await handlePagination(interaction);
    }
  } catch (error) {
    console.error('Error handling button interaction:', error);
    if (!interaction.replied) {
      interaction.reply({ content: 'حدث خطأ أثناء معالجة التفاعل. يرجى المحاولة مرة أخرى.', flags: MessageFlags.Ephemeral }).catch(console.error);
    }
  }
}


async function handleJoinGame(interaction) {
  try {
    const savedGame = await Games.get(interaction.guildId);
    const allPlayers = AllPlayers.get(interaction.guildId);

    if (!savedGame) {
      interaction
        .reply({ content: 'لا توجد لعبة قيد التشغيل حاليًا في هذا السيرفر.', flags: MessageFlags.Ephemeral })
        .catch(console.error);
      return;
    }

    if (savedGame.players.some(user => user.user === interaction.user.id)) {
      interaction
        .reply({
          content: 'لقد انضممت بالفعل.',
          flags: MessageFlags.Ephemeral,
        })
        .catch(console.error);
      return;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);

    const assignedNumbers = savedGame.players.map(p => parseInt(p.buttonNumber, 10));
    let number = 1;
    while (assignedNumbers.includes(number)) {
      number++;
    }

    if (number > 40) {
      interaction
        .reply({
          content: 'تم الوصول إلى الحد الأقصى لعدد اللاعبين في هذه اللعبة.',
          flags: MessageFlags.Ephemeral,
        })
        .catch(console.error);
      return;
    }

    const playerData = {
      user: interaction.user.id,
      buttonNumber: number.toString(),
      username: member.displayName,
      avatar: interaction.user.displayAvatarURL({ size: 256, extension: 'png' }),
      color: interaction.user.hexAccentColor,
      shield: false,
      shieldUsed: false,
      reviveUsed: false,
      freezeUsed: false,
      frozen: false,
      switchUsed: false,
      kills: 0,
      deaths: 0,
    };

    savedGame.players.push(playerData);
    allPlayers.set(interaction.user.id, playerData);
    Games.set(interaction.guildId, savedGame);
    AllPlayers.set(interaction.guildId, allPlayers);

    const messageId = savedGame.messageId;
    const channel = interaction.channel;

    const message = await channel.messages.fetch(messageId);

    const joinCount = savedGame.players.length;

    // Update the embed with the new player count
    const currentEmbed = message.embeds[0];
    const updatedEmbed = EmbedBuilder.from(currentEmbed)
      .spliceFields(4, 1, { name: '👥 عدد اللاعبين', value: `${joinCount}/40 لاعبين انضموا` });

    await message.edit({ embeds: [updatedEmbed] }).catch(console.error);

    interaction
      .reply({ content: `انضممت بنجاح! رقمك هو ${number}.`, flags: MessageFlags.Ephemeral })
      .catch(console.error);
  } catch (error) {
    console.error('Error handling join game:', error);
    interaction.reply({ content: 'حدث خطأ أثناء الانضمام إلى اللعبة.', flags: MessageFlags.Ephemeral }).catch(console.error);
  }
}


async function handleLeaveGame(interaction) {
  try {
    const savedGame = await Games.get(interaction.guildId);

    if (!savedGame) {
      interaction
        .reply({ content: 'لا توجد لعبة قيد التشغيل حاليًا في هذا السيرفر.', flags: MessageFlags.Ephemeral })
        .catch(console.error);
      return;
    }

    if (!savedGame.players.some(user => user.user === interaction.user.id)) {
      interaction.reply({ content: 'لم تنضم إلى اللعبة.', flags: MessageFlags.Ephemeral }).catch(console.error);
      return;
    }

    savedGame.players = savedGame.players.filter(user => user.user !== interaction.user.id);
    await Games.set(interaction.guildId, savedGame);

    const messageId = savedGame.messageId;
    const channel = interaction.channel;

    const message = await channel.messages.fetch(messageId);

    const joinCount = savedGame.players.length;

    // Update the embed with the new player count
    const currentEmbed = message.embeds[0];
    const updatedEmbed = EmbedBuilder.from(currentEmbed)
      .spliceFields(4, 1, { name: '👥 عدد اللاعبين', value: `${joinCount}/40 لاعبين انضموا` });

    await message.edit({ embeds: [updatedEmbed] }).catch(console.error);

    interaction.reply({ content: 'لقد غادرت اللعبة.', flags: MessageFlags.Ephemeral }).catch(console.error);
  } catch (error) {
    console.error('Error handling leave game:', error);
    interaction.reply({ content: 'حدث خطأ أثناء مغادرة اللعبة.', flags: MessageFlags.Ephemeral }).catch(console.error);
  }
}


async function handleKickPlayer(interaction) {
  try {
    const kickedUserId = interaction.customId.split('_')[1];

    const savedGame = await Games.get(interaction.guildId);
    const kickedPlayers = await KickedPlayers.get(interaction.guildId);
    const allPlayers = AllPlayers.get(interaction.guildId);

    if (!savedGame) {
      interaction
        .reply({ content: 'لا توجد لعبة قيد التشغيل حاليًا في هذا السيرفر.', flags: MessageFlags.Ephemeral })
        .catch(console.error);
      return;
    }

    if (interaction.user.id !== savedGame?.winner.id) {
      interaction
        .reply({ content: 'ليس دورك في اللعبة، لذا لا يمكنك طرد اللاعبين.', flags: MessageFlags.Ephemeral })
        .catch(console.error);
      return;
    }
    if (Date.now() > savedGame.winner.until) {
      interaction.reply({ content: 'لقد فاتك دورك.', flags: MessageFlags.Ephemeral }).catch(console.error);
      return;
    }

    const playerToKick = savedGame.players.find(player => player.user === kickedUserId);

    if (!playerToKick) {
      interaction.reply({ content: 'هذا اللاعب غير موجود في اللعبة.', flags: MessageFlags.Ephemeral }).catch(console.error);
      return;
    }

    if (playerToKick.shield) {
      interaction
        .reply({ content: 'لا يمكنك طرد هذا اللاعب لأنه محمي للدور القادم.', flags: MessageFlags.Ephemeral })
        .catch(console.error);
      return;
    }

    kickedPlayers.players.push(playerToKick);
    playerToKick.deaths += 1;
    const kicker = savedGame.players.find(player => player.user === interaction.user.id);
    kicker.kills += 1;
    allPlayers.get(playerToKick.user).deaths = playerToKick.deaths;
    allPlayers.get(kicker.user).kills = kicker.kills;

    savedGame.players = savedGame.players.filter(player => player.user !== kickedUserId);
    savedGame.winner.id = '';

    await Games.set(interaction.guildId, savedGame);
    await KickedPlayers.set(interaction.guildId, kickedPlayers);
    await AllPlayers.set(interaction.guildId, allPlayers);

    interaction
      .reply({ content: 'تم طرد اللاعب من اللعبة.', flags: MessageFlags.Ephemeral })
      .catch(console.error);
    interaction.channel
      .send(
        `💣 | <@${kickedUserId}> تم طرده من اللعبة، ستبدأ الجولة التالية قريبًا...`,
      )
      .catch(console.error);
    await startGame(interaction).catch(console.error);
  } catch (error) {
    console.error('Error handling kick player:', error);
    interaction.reply({ content: 'حدث خطأ أثناء طرد اللاعب.', flags: MessageFlags.Ephemeral }).catch(console.error);
  }
}


async function handleAutoKick(interaction) {
  try {
    const savedGame = await Games.get(interaction.guildId);

    if (!savedGame) {
      interaction
        .reply({ content: 'لا توجد لعبة قيد التشغيل حاليًا في هذا السيرفر.', ephemeral: true })
        .catch(console.error);
      return;
    }

    if (interaction.user.id !== savedGame?.winner.id) {
      interaction
        .reply({
          content: 'ليس دورك في اللعبة، لذا لا يمكنك تنفيذ هذا الإجراء.',
          ephemeral: true,
        })
        .catch(console.error);
      return;
    }
    if (Date.now() > savedGame.winner.until) {
      interaction.reply({ content: 'لقد فاتك دورك.', ephemeral: true }).catch(console.error);
      return;
    }

    const randomPlayer = savedGame.players.find(
      player => player.user !== interaction.user.id && !player.shield,
    );
    if (!randomPlayer) {
      interaction
        .reply({ content: 'لا يوجد لاعبون لطردهم.', ephemeral: true })
        .catch(console.error);
      return;
    }

    const kickedPlayers = await KickedPlayers.get(interaction.guildId);
    const allPlayers = AllPlayers.get(interaction.guildId);

    kickedPlayers.players.push(randomPlayer);
    randomPlayer.deaths += 1;
    const kicker = savedGame.players.find(player => player.user === interaction.user.id);
    kicker.kills += 1;
    allPlayers.get(randomPlayer.user).deaths = randomPlayer.deaths;
    allPlayers.get(kicker.user).kills = kicker.kills;

    savedGame.players = savedGame.players.filter(player => player.user !== randomPlayer.user);
    savedGame.winner.id = '';

    await Games.set(interaction.guildId, savedGame);
    await KickedPlayers.set(interaction.guildId, kickedPlayers);
    await AllPlayers.set(interaction.guildId, allPlayers);

    interaction
      .reply({ content: 'تم طرد اللاعب تلقائيًا من اللعبة.', ephemeral: true })
      .catch(console.error);
    interaction.channel
      .send(
        `💣 | <@${randomPlayer.user}> تم طرده من اللعبة تلقائيًا، ستبدأ الجولة التالية قريبًا...`,
      )
      .catch(console.error);

    await startGame(interaction).catch(console.error);
  } catch (error) {
    console.error('Error handling auto kick:', error);
    interaction.reply({ content: 'حدث خطأ أثناء الطرد التلقائي.', ephemeral: true }).catch(console.error);
  }
}


async function handleWithdrawal(interaction) {
  try {
    const savedGame = await Games.get(interaction.guildId);

    if (!savedGame) {
      interaction
        .reply({ content: 'لا توجد لعبة قيد التشغيل حاليًا في هذا السيرفر.', ephemeral: true })
        .catch(console.error);
      return;
    }

    if (interaction.user.id !== savedGame?.winner.id) {
      interaction
        .reply({
          content: 'ليس دورك في اللعبة، لذا لا يمكنك تنفيذ هذا الإجراء.',
          ephemeral: true,
        })
        .catch(console.error);
      return;
    }
    if (Date.now() > savedGame.winner.until) {
      interaction.reply({ content: 'لقد فاتك دورك.', ephemeral: true }).catch(console.error);
      return;
    }

    savedGame.players = savedGame.players.filter(player => player.user !== interaction.user.id);
    savedGame.winner.id = '';

    await Games.set(interaction.guildId, savedGame);

    interaction
      .reply({ content: 'لقد انسحبت بنجاح من اللعبة.', ephemeral: true })
      .catch(console.error);
    interaction.channel
      .send(
        `💣 | <@${interaction.user.id}> انسحب من اللعبة، ستبدأ الجولة التالية قريبًا...`,
      )
      .catch(console.error);

    await startGame(interaction).catch(console.error);
  } catch (error) {
    console.error('Error handling withdrawal:', error);
    interaction.reply({ content: 'حدث خطأ أثناء الانسحاب من اللعبة.', ephemeral: true }).catch(console.error);
  }
}


async function handleReviveAction(interaction) {
  try {
    const savedGame = await Games.get(interaction.guildId);
    const kickedPlayers = await KickedPlayers.get(interaction.guildId);

    if (!savedGame) {
      interaction.reply({ content: 'لا توجد لعبة قيد التشغيل حاليًا في هذا السيرفر.', ephemeral: true }).catch(console.error);
      return;
    }

    if (interaction.user.id !== savedGame?.winner.id) {
      interaction.reply({
        content: 'ليس دورك في اللعبة، لذا لا يمكنك تنفيذ هذا الإجراء.',
        ephemeral: true,
      }).catch(console.error);
      return;
    }

    if (!kickedPlayers || !kickedPlayers.players.length) {
      interaction.reply({ content: 'لا يوجد لاعبون لإعادتهم.', ephemeral: true }).catch(console.error);
      return;
    }

    const currentPlayer = savedGame.players.find(player => player.user === interaction.user.id);

    if (currentPlayer.reviveUsed) {
      interaction.reply({
        content: 'يمكنك استخدام انعاش اللاعب مرة واحدة فقط في اللعبة.',
        ephemeral: true,
      }).catch(console.error);
      return;
    }

    // Check if player has enough points
    if (!(await pointsManager.hasEnoughPoints(interaction.user.id, ABILITY_COST))) {
      const currentPoints = await pointsManager.getPoints(interaction.user.id);
      interaction.reply({
        content: `❌ **ليس لديك نقاط كافية لاستخدام هذه القدرة!**\nتحتاج إلى ${ABILITY_COST} نقاط ولديك ${currentPoints} نقطة فقط.`,
        ephemeral: true,
      }).catch(console.error);
      return;
    }

    const maxButtons = 21;
    const reviveButtons = kickedPlayers.players.slice(0, maxButtons).map(player =>
      new ButtonBuilder()
        .setCustomId(`select_player_revive_${player.user}`)
        .setLabel(`${player.buttonNumber} - ${player.username}`)
        .setStyle(ButtonStyle.Secondary)
    );

    const components = createButtonRows(reviveButtons);

    const message = await interaction.reply({
      content: 'اختر لاعبًا لإعادته:',
      components: components,
      ephemeral: true,
      fetchReply: true,
    });

    savedGame.actionData = {
      action: 'revive',
    };
    await Games.set(interaction.guildId, savedGame);

  } catch (error) {
    console.error('Error handling revive action:', error);
    interaction.reply({ content: 'حدث خطأ أثناء تنفيذ إجراء الإحياء.', ephemeral: true }).catch(console.error);
  }
}


async function handleSelectPlayer(interaction) {
  try {
    const [action, userId] = interaction.customId.split('_').slice(2);
    const savedGame = await Games.get(interaction.guildId);

    if (!savedGame) {
      interaction.reply({ content: 'لا توجد لعبة قيد التشغيل حاليًا في هذا السيرفر.', ephemeral: true }).catch(console.error);
      return;
    }

    if (interaction.user.id !== savedGame.winner.id) {
      interaction.reply({ content: 'ليس دورك في اللعبة، لذا لا يمكنك تنفيذ هذا الإجراء.', ephemeral: true }).catch(console.error);
      return;
    }

    switch (action) {
      case 'revive':
        await revivePlayer(interaction, userId);
        break;
      case 'shield':
        await shieldPlayer(interaction, userId);
        break;
      case 'switch':
        await switchPlayer(interaction, userId);
        break;
      case 'freeze':
        await freezePlayer(interaction, userId);
        break;
      default:
        interaction.reply({ content: 'إجراء غير معروف.', ephemeral: true }).catch(console.error);
    }
  } catch (error) {
    console.error('Error handling select player:', error);
    interaction.reply({ content: 'حدث خطأ أثناء تنفيذ الإجراء.', ephemeral: true }).catch(console.error);
  }
}


async function revivePlayer(interaction, userId) {
  try {
    const savedGame = await Games.get(interaction.guildId);
    const kickedPlayers = await KickedPlayers.get(interaction.guildId);
    const allPlayers = AllPlayers.get(interaction.guildId);

    const currentPlayer = savedGame.players.find(player => player.user === interaction.user.id);

    if (currentPlayer.reviveUsed) {
      interaction.reply({
        content: 'يمكنك استخدام انعاش اللاعب مرة واحدة فقط في اللعبة.',
        ephemeral: true,
      }).catch(console.error);
      return;
    }

    const playerToRevive = kickedPlayers.players.find(player => player.user === userId);

    if (!playerToRevive) {
      interaction.reply({ content: 'هذا اللاعب غير موجود في قائمة المطرودين.', ephemeral: true }).catch(console.error);
      return;
    }

    kickedPlayers.players = kickedPlayers.players.filter(player => player.user !== userId);
    savedGame.players.push(playerToRevive);
    savedGame.winner.id = '';
    currentPlayer.reviveUsed = true;

    // Deduct points for using the ability
    await pointsManager.removePoints(interaction.user.id, ABILITY_COST);

    allPlayers.get(playerToRevive.user).reviveUsed = true;

    await Games.set(interaction.guildId, savedGame);
    await KickedPlayers.set(interaction.guildId, kickedPlayers);
    await AllPlayers.set(interaction.guildId, allPlayers);

    interaction
      .reply({
        content: `تم إحياء اللاعب ${playerToRevive.username} بنجاح وإعادته إلى اللعبة.`,
        ephemeral: true,
      })
      .catch(console.error);
    interaction.channel
      .send(
        `💖 | <@${playerToRevive.user}> تم إحياؤه وإعادته إلى اللعبة، ستبدأ الجولة التالية قريبًا...`,
      )
      .catch(console.error);

    await startGame(interaction).catch(console.error);
  } catch (error) {
    console.error('Error reviving player:', error);
    interaction.reply({ content: 'حدث خطأ أثناء إحياء اللاعب.', ephemeral: true }).catch(console.error);
  }
}


async function handleProtectYourself(interaction) {
  try {
    const savedGame = await Games.get(interaction.guildId);

    if (!savedGame) {
      interaction
        .reply({ content: 'لا توجد لعبة قيد التشغيل حاليًا في هذا السيرفر.', ephemeral: true })
        .catch(console.error);
      return;
    }

    if (interaction.user.id !== savedGame?.winner.id) {
      interaction
        .reply({
          content: 'ليس دورك في اللعبة، لذا لا يمكنك تنفيذ هذا الإجراء.',
          ephemeral: true,
        })
        .catch(console.error);
      return;
    }

    const currentPlayer = savedGame.players.find(player => player.user === interaction.user.id);

    if (currentPlayer.shieldUsed) {
      interaction
        .reply({ content: 'يمكنك استخدام حماية نفسك مرة واحدة فقط في اللعبة.', ephemeral: true })
        .catch(console.error);
      return;
    }

    // Check if player has enough points
    if (!(await pointsManager.hasEnoughPoints(interaction.user.id, ABILITY_COST))) {
      const currentPoints = await pointsManager.getPoints(interaction.user.id);
      interaction.reply({
        content: `❌ **ليس لديك نقاط كافية لاستخدام هذه القدرة!**\nتحتاج إلى ${ABILITY_COST} نقاط ولديك ${currentPoints} نقطة فقط.`,
        ephemeral: true,
      }).catch(console.error);
      return;
    }

    const maxButtons = 21;
    const shieldButtons = savedGame.players.slice(0, maxButtons).map(player =>
      new ButtonBuilder()
        .setCustomId(`select_player_shield_${player.user}`)
        .setLabel(`${player.buttonNumber} - ${player.username}`)
        .setStyle(ButtonStyle.Secondary)
    );

    const components = createButtonRows(shieldButtons);

    const message = await interaction.reply({
      content: 'اختر لاعبًا لتمنحه الحماية:',
      components: components,
      ephemeral: true,
      fetchReply: true,
    });

    savedGame.actionData = {
      action: 'shield',
    };
    await Games.set(interaction.guildId, savedGame);
  } catch (error) {
    console.error('Error handling protect action:', error);
    interaction.reply({ content: 'حدث خطأ أثناء تنفيذ إجراء الحماية.', ephemeral: true }).catch(console.error);
  }
}


async function shieldPlayer(interaction, userId) {
  try {
    const savedGame = await Games.get(interaction.guildId);
    const allPlayers = AllPlayers.get(interaction.guildId);

    const currentPlayer = savedGame.players.find(player => player.user === interaction.user.id);

    if (currentPlayer.shieldUsed) {
      interaction
        .reply({ content: 'يمكنك استخدام حماية نفسك مرة واحدة فقط في اللعبة.', ephemeral: true })
        .catch(console.error);
      return;
    }

    const playerToShield = savedGame.players.find(player => player.user === userId);

    if (!playerToShield) {
      interaction
        .reply({ content: 'لا يوجد لاعب بهذا الاسم في اللعبة.', ephemeral: true })
        .catch(console.error);
      return;
    }

    playerToShield.shield = true;
    currentPlayer.shieldUsed = true;

    // Deduct points for using the ability
    await pointsManager.removePoints(interaction.user.id, ABILITY_COST);

    allPlayers.get(playerToShield.user).shieldUsed = true;

    await Games.set(interaction.guildId, savedGame);
    await AllPlayers.set(interaction.guildId, allPlayers);

    interaction
      .reply({
        content: `تم منح الحماية بنجاح للاعب ${playerToShield.username}.`,
        ephemeral: true,
      })
      .catch(console.error);
    interaction.channel
      .send(`🛡️ | <@${playerToShield.user}> تم منحه الحماية للدور القادم.`)
      .catch(console.error);

    savedGame.winner.id = '';
    await Games.set(interaction.guildId, savedGame);
    await startGame(interaction).catch(console.error);
  } catch (error) {
    console.error('Error shielding player:', error);
    interaction.reply({ content: 'حدث خطأ أثناء منح الحماية.', ephemeral: true }).catch(console.error);
  }
}


async function handleSwitchTurn(interaction) {
  try {
    const savedGame = await Games.get(interaction.guildId);

    if (!savedGame) {
      interaction
        .reply({ content: 'لا توجد لعبة قيد التشغيل حاليًا في هذا السيرفر.', ephemeral: true })
        .catch(console.error);
      return;
    }

    if (interaction.user.id !== savedGame?.winner.id) {
      interaction
        .reply({
          content: 'ليس دورك في اللعبة، لذا لا يمكنك تنفيذ هذا الإجراء.',
          ephemeral: true,
        })
        .catch(console.error);
      return;
    }

    const currentPlayer = savedGame.players.find(player => player.user === interaction.user.id);

    if (currentPlayer.switchUsed) {
      interaction
        .reply({
          content: 'يمكنك تبديل دورك مرة واحدة فقط في اللعبة.',
          ephemeral: true,
        })
        .catch(console.error);
      return;
    }

    // Check if player has enough points
    if (!(await pointsManager.hasEnoughPoints(interaction.user.id, ABILITY_COST))) {
      const currentPoints = await pointsManager.getPoints(interaction.user.id);
      interaction.reply({
        content: `❌ **ليس لديك نقاط كافية لاستخدام هذه القدرة!**\nتحتاج إلى ${ABILITY_COST} نقاط ولديك ${currentPoints} نقطة فقط.`,
        ephemeral: true,
      }).catch(console.error);
      return;
    }

    const maxButtons = 21;
    const switchButtons = savedGame.players
      .filter(player => player.user !== interaction.user.id)
      .slice(0, maxButtons)
      .map(player =>
        new ButtonBuilder()
          .setCustomId(`select_player_switch_${player.user}`)
          .setLabel(`${player.buttonNumber} - ${player.username}`)
          .setStyle(ButtonStyle.Secondary)
      );

    const components = createButtonRows(switchButtons);

    const message = await interaction.reply({
      content: 'اختر لاعبًا لتبديل دورك معه:',
      components: components,
      ephemeral: true,
      fetchReply: true,
    });

    savedGame.actionData = {
      action: 'switch',
    };
    await Games.set(interaction.guildId, savedGame);
  } catch (error) {
    console.error('Error handling switch turn action:', error);
    interaction.reply({ content: 'حدث خطأ أثناء تنفيذ إجراء تبديل الدور.', ephemeral: true }).catch(console.error);
  }
}


async function switchPlayer(interaction, userId) {
  try {
    const savedGame = await Games.get(interaction.guildId);
    const allPlayers = AllPlayers.get(interaction.guildId);

    const currentPlayer = savedGame.players.find(player => player.user === interaction.user.id);

    if (currentPlayer.switchUsed) {
      interaction
        .reply({
          content: 'يمكنك تبديل دورك مرة واحدة فقط في اللعبة.',
          ephemeral: true,
        })
        .catch(console.error);
      return;
    }

    const playerToSwitch = savedGame.players.find(player => player.user === userId);

    if (!playerToSwitch) {
      interaction
        .reply({ content: 'لا يوجد لاعب بهذا الاسم في اللعبة.', ephemeral: true })
        .catch(console.error);
      return;
    }

    savedGame.winner.id = playerToSwitch.user;
    savedGame.winner.until = Date.now() + chooseTimeout * 1000;

    currentPlayer.switchUsed = true;

    // Deduct points for using the ability
    await pointsManager.removePoints(interaction.user.id, ABILITY_COST);

    allPlayers.get(interaction.user.id).switchUsed = true;

    await AllPlayers.set(interaction.guildId, allPlayers);
    await Games.set(interaction.guildId, savedGame);

    interaction
      .reply({
        content: `تم تبديل دورك مع اللاعب ${playerToSwitch.username}.`,
        ephemeral: true,
      })
      .catch(console.error);
    interaction.channel
      .send(
        `🔄 | <@${interaction.user.id}> قام بتبديل دوره مع <@${playerToSwitch.user}>. لديك ${chooseTimeout} ثانية للاختيار!`,
      )
      .catch(console.error);

    setTimeout(async () => {
      try {
        const checkUser = await Games.get(interaction.guildId);
        if (
          checkUser &&
          checkUser.winner.id === playerToSwitch.user &&
          Date.now() >= checkUser.winner.until
        ) {
          checkUser.players = checkUser.players.filter(player => player.user !== playerToSwitch.user);
          checkUser.winner.id = '';

          await Games.set(interaction.guildId, checkUser);

          interaction.channel
            .send(
              `⏰ | <@${playerToSwitch.user}> تم طرده من اللعبة بسبب انتهاء الوقت. ستبدأ الجولة التالية قريبًا...`,
            )
            .catch(console.error);

          await startGame(interaction).catch(console.error);
        }
      } catch (error) {
        console.error('Error during switch turn timeout:', error);
      }
    }, chooseTimeout * 1000);
  } catch (error) {
    console.error('Error switching player turn:', error);
    interaction.reply({ content: 'حدث خطأ أثناء تبديل الدور.', ephemeral: true }).catch(console.error);
  }
}


async function handleFreezeAction(interaction) {
  try {
    const savedGame = await Games.get(interaction.guildId);

    if (!savedGame) {
      interaction.reply({ content: 'لا توجد لعبة قيد التشغيل حاليًا في هذا السيرفر.', ephemeral: true }).catch(console.error);
      return;
    }

    if (interaction.user.id !== savedGame?.winner.id) {
      interaction.reply({
        content: 'ليس دورك في اللعبة، لذا لا يمكنك تنفيذ هذا الإجراء.',
        ephemeral: true,
      }).catch(console.error);
      return;
    }

    const currentPlayer = savedGame.players.find(player => player.user === interaction.user.id);

    if (currentPlayer.freezeUsed) {
      interaction.reply({
        content: 'يمكنك استخدام تجميد لاعب مرة واحدة فقط في اللعبة.',
        ephemeral: true,
      }).catch(console.error);
      return;
    }

    // Check if player has enough points
    if (!(await pointsManager.hasEnoughPoints(interaction.user.id, ABILITY_COST))) {
      const currentPoints = await pointsManager.getPoints(interaction.user.id);
      interaction.reply({
        content: `❌ **ليس لديك نقاط كافية لاستخدام هذه القدرة!**\nتحتاج إلى ${ABILITY_COST} نقاط ولديك ${currentPoints} نقطة فقط.`,
        ephemeral: true,
      }).catch(console.error);
      return;
    }

    const maxButtons = 21;
    const freezeButtons = savedGame.players
      .filter(player => player.user !== interaction.user.id)
      .slice(0, maxButtons)
      .map(player =>
        new ButtonBuilder()
          .setCustomId(`select_player_freeze_${player.user}`)
          .setLabel(`${player.buttonNumber} - ${player.username}`)
          .setStyle(ButtonStyle.Secondary)
      );

    const components = createButtonRows(freezeButtons);

    const message = await interaction.reply({
      content: 'اختر لاعبًا لتجميده:',
      components: components,
      ephemeral: true,
      fetchReply: true,
    });

    savedGame.actionData = {
      action: 'freeze',
    };
    await Games.set(interaction.guildId, savedGame);
  } catch (error) {
    console.error('Error handling freeze action:', error);
    interaction.reply({ content: 'حدث خطأ أثناء تنفيذ إجراء التجميد.', ephemeral: true }).catch(console.error);
  }
}


async function freezePlayer(interaction, userId) {
  try {
    const savedGame = await Games.get(interaction.guildId);
    const allPlayers = AllPlayers.get(interaction.guildId);

    const currentPlayer = savedGame.players.find(player => player.user === interaction.user.id);

    if (currentPlayer.freezeUsed) {
      interaction.reply({
        content: 'يمكنك استخدام تجميد لاعب مرة واحدة فقط في اللعبة.',
        ephemeral: true,
      }).catch(console.error);
      return;
    }

    const playerToFreeze = savedGame.players.find(player => player.user === userId);

    if (!playerToFreeze) {
      interaction.reply({ content: 'لا يوجد لاعب بهذا الاسم في اللعبة.', ephemeral: true }).catch(console.error);
      return;
    }

    playerToFreeze.frozen = true;
    currentPlayer.freezeUsed = true;

    // Deduct points for using the ability
    await pointsManager.removePoints(interaction.user.id, ABILITY_COST);

    allPlayers.get(playerToFreeze.user).frozen = true;
    allPlayers.get(interaction.user.id).freezeUsed = true;

    await Games.set(interaction.guildId, savedGame);
    await AllPlayers.set(interaction.guildId, allPlayers);

    interaction.reply({
      content: `تم تجميد قدرات اللاعب ${playerToFreeze.username} لدوره القادم.`,
      ephemeral: true,
    }).catch(console.error);

    interaction.channel.send(`❄️ | <@${playerToFreeze.user}> تم تجميد قدراته للدور القادم.`).catch(console.error);

    savedGame.winner.id = '';
    await Games.set(interaction.guildId, savedGame);
    await startGame(interaction).catch(console.error);
  } catch (error) {
    console.error('Error freezing player:', error);
    interaction.reply({ content: 'حدث خطأ أثناء تجميد اللاعب.', ephemeral: true }).catch(console.error);
  }
}


async function handlePagination(interaction) {
}


async function startGame(source, start = false) {
  try {
    const guildId = source.guildId || source.guild.id;
    const savedData = await Games.get(guildId);

    if (!savedData) {
      return;
    }

    const { players } = savedData;
    if (players.length === 0) {
      await sleep(5);
      source.channel
        .send({ content: ':x: تم إلغاء اللعبة: لا يوجد لاعبون.' })
        .catch(console.error);
      await cleanUpGame(guildId);
      return;
    }
    if (start) {
      await source.channel
        .send({
          content: '✅ | تم توزيع الأرقام على كل لاعب. ستبدأ الجولة الأولى في غضون ثوانٍ قليلة...',
        })
        .catch(console.error);
    }
    await sleep(timeBetweenRounds);
    const colorsGradient = ['#32517f', '#4876a3', '#5d8ec7', '#74a6eb', '#8ac0ff'];

    const options = players.map((user, index) => ({
      user: user,
      label: user.username,
      color: colorsGradient[index % colorsGradient.length],
    }));

    const winnerOption = options[Math.floor(Math.random() * options.length)];
    const winnerIndex = options.indexOf(winnerOption);
    options[winnerIndex] = {
      ...winnerOption,
      winner: true,
    };

    const time = Date.now() + chooseTimeout * 1000;
    savedData.winner = { id: winnerOption.user.user, until: time };
    await Games.set(guildId, savedData);
    const image = await createWheel(options, winnerOption.user.avatar);

    const kickablePlayers = players.filter(user => user.user !== winnerOption.user.user);

    const kickButtons = kickablePlayers.map(player =>
      new ButtonBuilder()
        .setCustomId(`kick_${player.user}`)
        .setLabel(`${player.buttonNumber} - ${player.username}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(player.shield)
    );

    const kickButtonPages = paginateButtons(kickButtons, 'kick');

    const currentPlayer = players.find(player => player.user === winnerOption.user.user);

    const actionButtons = [
      new ButtonBuilder()
        .setCustomId('auto_kick')
        .setLabel('طرد تلقائي')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPlayer.frozen),
      new ButtonBuilder()
        .setCustomId('revive_player')
        .setLabel('انعاش اللاعب')
        .setStyle(ButtonStyle.Success)
        .setDisabled(currentPlayer.frozen || currentPlayer.reviveUsed),
      new ButtonBuilder()
        .setCustomId('protect_player')
        .setLabel('حماية لاعب')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPlayer.frozen || currentPlayer.shieldUsed),
      new ButtonBuilder()
        .setCustomId('switch_turn')
        .setLabel('تبادل دور')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPlayer.frozen || currentPlayer.switchUsed),
      new ButtonBuilder()
        .setCustomId('freeze_player')
        .setLabel('تجميد لاعب')
        .setStyle(ButtonStyle.Success)
        .setDisabled(currentPlayer.frozen || currentPlayer.freezeUsed),
      new ButtonBuilder()
        .setCustomId('withdrawal')
        .setLabel('انسحاب')
        .setStyle(ButtonStyle.Danger),
    ];

    const attachment = new AttachmentBuilder(image, { name: 'wheel.png' });

    if (players.length <= 2) {
      // Award points to the winner
      const newPoints = await pointsManager.awardWin(winnerOption.user.user);

      // Record losses for other players
      for (const player of players) {
        if (player.user !== winnerOption.user.user) {
          await pointsManager.recordLoss(player.user);
        }
      }

      await source.channel
        .send({
          content: `**${winnerOption.user.buttonNumber} - <@${winnerOption.user.user}> **\n:crown: هذه هي الجولة الأخيرة! اللاعب المختار هو الفائز في اللعبة.\n\n🏆 **تم منح نقطة واحدة للفائز! النقاط الحالية: ${newPoints}**`,
          files: [attachment],
        })
        .catch(console.error);

      await cleanUpGame(guildId);
      return;
    } else {
      const message = await source.channel
        .send({
          content: `**${winnerOption.user.buttonNumber} - <@${winnerOption.user.user}> **\n⏰ | لديك ${chooseTimeout} ثانية لاختيار لاعب للطرد`,
          files: [attachment],
          components: kickButtonPages[0],
        })
        .catch(console.error);

      savedData.pagination = {
        messageId: message.id,
        page: 0,
        totalPages: kickButtonPages.length,
        buttonsType: 'kick',
        buttons: kickButtons,
      };
      savedData.actionButtons = actionButtons;
      await Games.set(guildId, savedData);

      const actionRows = createActionRowFromButtons(actionButtons);

      const actionMessage = await source.channel.send({
        content: `**خيارات إضافية لـ <@${winnerOption.user.user}> **`,
        components: actionRows,
      });

      savedData.actionMessageId = actionMessage.id;
      await Games.set(guildId, savedData);

      setTimeout(async () => {
        try {
          const checkUser = await Games.get(guildId);
          if (
            checkUser &&
            checkUser.winner.id === winnerOption.user.user &&
            Date.now() >= checkUser.winner.until
          ) {
            checkUser.players = checkUser.players.filter(
              player => player.user !== winnerOption.user.user,
            );
            checkUser.winner.id = '';

            await Games.set(guildId, checkUser);

            source.channel
              .send(
                `⏰ | <@${winnerOption.user.user}> تم طرده من اللعبة بسبب انتهاء الوقت. ستبدأ الجولة التالية قريبًا...`,
              )
              .catch(console.error);

            await startGame(source).catch(console.error);
          }
        } catch (error) {
          console.error('Error during timeout handling:', error);
        }
      }, chooseTimeout * 1000);
    }

    if (currentPlayer.frozen) {
      currentPlayer.frozen = false;
      await Games.set(guildId, savedData);
    }

    savedData.players.forEach(player => {
      if (player.shield) {
        player.shield = false;
      }
    });
    await Games.set(guildId, savedData);
  } catch (error) {
    console.error('Error during game execution:', error);
    source.channel
      .send({ content: 'حدث خطأ أثناء تشغيل اللعبة. يرجى المحاولة مرة أخرى.' })
      .catch(console.error);
  }
}


function paginateButtons(buttons, buttonsType) {
  const maxButtonsPerRow = 5;
  const maxActionRows = 4;
  const buttonsPerPage = maxButtonsPerRow * maxActionRows;

  const totalPages = Math.ceil(buttons.length / buttonsPerPage);
  const pages = [];

  for (let i = 0; i < totalPages; i++) {
    const pageButtons = buttons.slice(i * buttonsPerPage, (i + 1) * buttonsPerPage);
    const components = [];

    let actionRow = new ActionRowBuilder();
    pageButtons.forEach((button, index) => {
      if (index % maxButtonsPerRow === 0 && index !== 0) {
        components.push(actionRow);
        actionRow = new ActionRowBuilder();
      }
      actionRow.addComponents(button);
    });
    if (actionRow.components.length > 0) {
      components.push(actionRow);
    }

    if (totalPages > 1) {
      const navigationRow = new ActionRowBuilder();
      const previousButton = new ButtonBuilder()
        .setCustomId(`paginate_${buttonsType}_previous`)
        .setLabel('السابق')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(i === 0);

      const nextButton = new ButtonBuilder()
        .setCustomId(`paginate_${buttonsType}_next`)
        .setLabel('التالي')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(i === totalPages - 1);

      navigationRow.addComponents(previousButton, nextButton);
      components.push(navigationRow);
    }

    pages.push(components);
  }

  return pages;
}


function createActionRowFromButtons(buttons) {
  const components = [];
  const maxButtonsPerRow = 5;

  let actionRow = new ActionRowBuilder();
  for (let i = 0; i < buttons.length; i++) {
    if (actionRow.components.length >= maxButtonsPerRow) {
      components.push(actionRow);
      actionRow = new ActionRowBuilder();
    }
    actionRow.addComponents(buttons[i]);
  }
  if (actionRow.components.length > 0) {
    components.push(actionRow);
  }

  return components;
}


async function cleanUpGame(guildId) {
  try {
    await Games.delete(guildId);
    await KickedPlayers.delete(guildId);
    await AllPlayers.delete(guildId);
  } catch (error) {
    console.error('Error cleaning up game:', error);
  }
}

client.login(token);
