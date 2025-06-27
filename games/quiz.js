const { EmbedBuilder } = require('discord.js');
const { allowedRoleIds } = require('../config.json');
const { pointsManager } = require('../points.js');

// Game timeout in milliseconds (15 seconds)
const GAME_TIMEOUT = 15000;

// Active games tracker
const activeGames = new Map();

// Quiz data structure
const quizData = {
  'اسرع': {
    name: 'لعبة الأسرع',
    questions: [
      {
        image: 'https://i.imgur.com/example1.jpg',
        answers: ['سرعة', 'سريع', 'أسرع', 'speed']
      },
      {
        image: 'https://i.imgur.com/example2.jpg',
        answers: ['برق', 'ضوء', 'نور', 'lightning']
      },
      {
        image: 'https://i.imgur.com/example3.jpg',
        answers: ['صاروخ', 'rocket', 'فضاء']
      }
    ]
  },
  'دين': {
    name: 'لعبة الدين',
    questions: [
      {
        image: 'https://i.imgur.com/example4.jpg',
        answers: ['مسجد', 'جامع', 'صلاة', 'mosque']
      },
      {
        image: 'https://i.imgur.com/example5.jpg',
        answers: ['قرآن', 'كتاب', 'مصحف', 'quran']
      },
      {
        image: 'https://i.imgur.com/example6.jpg',
        answers: ['كعبة', 'مكة', 'حج', 'kaaba']
      }
    ]
  },
  'اعلام': {
    name: 'لعبة الأعلام',
    questions: [
      {
        image: 'https://i.imgur.com/example7.jpg',
        answers: ['السعودية', 'المملكة العربية السعودية', 'سعودية', 'saudi arabia']
      },
      {
        image: 'https://i.imgur.com/example8.jpg',
        answers: ['مصر', 'جمهورية مصر العربية', 'مصرية', 'egypt']
      },
      {
        image: 'https://i.imgur.com/example9.jpg',
        answers: ['الإمارات', 'دولة الإمارات', 'uae', 'emirates']
      }
    ]
  },
  'شخصية': {
    name: 'لعبة الشخصيات',
    questions: [
      {
        image: 'https://i.imgur.com/example10.jpg',
        answers: ['محمد صلاح', 'صلاح', 'مو صلاح', 'salah']
      },
      {
        image: 'https://i.imgur.com/example11.jpg',
        answers: ['كريستيانو رونالدو', 'رونالدو', 'كريستيانو', 'ronaldo']
      },
      {
        image: 'https://i.imgur.com/example12.jpg',
        answers: ['ليونيل ميسي', 'ميسي', 'messi']
      }
    ]
  },
  'ترجم': {
    name: 'لعبة الترجمة',
    questions: [
      {
        image: 'https://i.imgur.com/example13.jpg',
        answers: ['كتاب', 'book', 'كتب']
      },
      {
        image: 'https://i.imgur.com/example14.jpg',
        answers: ['سيارة', 'car', 'عربية']
      },
      {
        image: 'https://i.imgur.com/example15.jpg',
        answers: ['بيت', 'منزل', 'house', 'home']
      }
    ]
  },
  'عواصم': {
    name: 'لعبة العواصم',
    questions: [
      {
        image: 'https://i.imgur.com/example16.jpg',
        answers: ['الرياض', 'رياض', 'riyadh']
      },
      {
        image: 'https://i.imgur.com/example17.jpg',
        answers: ['القاهرة', 'قاهرة', 'cairo']
      },
      {
        image: 'https://i.imgur.com/example18.jpg',
        answers: ['دبي', 'dubai', 'الإمارات']
      }
    ]
  },
  'تمويه': {
    name: 'لعبة التمويه',
    questions: [
      {
        image: 'https://i.imgur.com/example19.jpg',
        answers: ['نمر', 'تايجر', 'نمور', 'tiger']
      },
      {
        image: 'https://i.imgur.com/example20.jpg',
        answers: ['فراشة', 'butterfly', 'فراش']
      },
      {
        image: 'https://i.imgur.com/example21.jpg',
        answers: ['حرباء', 'chameleon', 'سحلية']
      }
    ]
  },
  'رتب': {
    name: 'لعبة ترتيب الكلمات',
    questions: [
      {
        image: 'https://i.imgur.com/example22.jpg',
        answers: ['مدرسة', 'school', 'تعليم']
      },
      {
        image: 'https://i.imgur.com/example23.jpg',
        answers: ['مستشفى', 'hospital', 'طبيب']
      },
      {
        image: 'https://i.imgur.com/example24.jpg',
        answers: ['مطعم', 'restaurant', 'طعام']
      }
    ]
  },
  'براند': {
    name: 'لعبة العلامات التجارية',
    questions: [
      {
        image: 'https://i.imgur.com/example25.jpg',
        answers: ['أبل', 'apple', 'ابل']
      },
      {
        image: 'https://i.imgur.com/example26.jpg',
        answers: ['سامسونج', 'samsung', 'سامسونغ']
      },
      {
        image: 'https://i.imgur.com/example27.jpg',
        answers: ['نايك', 'nike', 'نايكي']
      }
    ]
  }
};

// Check if user has permission to start games
function hasPermission(member) {
  if (member.permissions.has('Administrator')) {
    return true;
  }
  return allowedRoleIds.some(roleId => member.roles.cache.has(roleId));
}

// Normalize answer for comparison
function normalizeAnswer(answer) {
  return answer.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Start a quiz game
async function startQuizGame(message, gameType) {
  try {
    // Check permissions
    if (!hasPermission(message.member)) {
      await message.reply('❌ **ليس لديك الإذن لبدء الألعاب.**');
      return;
    }

    // Check if there's already an active game in this channel
    if (activeGames.has(message.channel.id)) {
      await message.reply('❌ **يوجد لعبة نشطة بالفعل في هذه القناة. انتظر حتى تنتهي.**');
      return;
    }

    // Get game data
    const gameData = quizData[gameType];
    if (!gameData || !gameData.questions || gameData.questions.length === 0) {
      await message.reply('❌ **هذه اللعبة غير متوفرة حالياً.**');
      return;
    }

    // Select random question
    const randomQuestion = gameData.questions[Math.floor(Math.random() * gameData.questions.length)];

    // Send the image
    await message.channel.send({
      content: `🎮 **${gameData.name}**\n⏰ لديكم 15 ثانية للإجابة!`,
      files: [randomQuestion.image]
    });

    // Track game start time
    const startTime = Date.now();

    // Set up active game
    activeGames.set(message.channel.id, {
      gameType,
      question: randomQuestion,
      startTime,
      starterId: message.author.id
    });

    // Set up message collector
    const filter = (msg) => !msg.author.bot && msg.channel.id === message.channel.id;
    const collector = message.channel.createMessageCollector({
      filter,
      time: GAME_TIMEOUT
    });

    collector.on('collect', async (msg) => {
      const userAnswer = normalizeAnswer(msg.content);
      const correctAnswers = randomQuestion.answers.map(answer => normalizeAnswer(answer));

      // Check if answer is correct
      if (correctAnswers.includes(userAnswer)) {
        const endTime = Date.now();
        const timeTaken = ((endTime - startTime) / 1000).toFixed(2);

        // Award point to winner
        const newPoints = await pointsManager.awardWin(msg.author.id);

        // Announce winner
        await message.channel.send(`🎉 مبروك <@${msg.author.id}>`);

        // Send success embed
        const successEmbed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('✅ إجابة صحيحة!')
          .setDescription(`⏱️ الوقت: ${timeTaken} ثانية\n🏆 النقاط الحالية: ${newPoints}`)
          .setFooter({ text: `${gameData.name}` });

        await message.channel.send({ embeds: [successEmbed] });

        // Stop collector and remove active game
        collector.stop('winner');
        activeGames.delete(message.channel.id);
      }
    });

    collector.on('end', async (collected, reason) => {
      if (reason !== 'winner') {
        // No one won - show correct answers
        const correctAnswersList = randomQuestion.answers.map(answer => `- ${answer}`).join('\n');

        await message.channel.send(
          `انتهى الوقت، لم يفز أحد هذه المرة\n:الإجابات الصحيحة\n${correctAnswersList}`
        );
      }

      // Clean up
      activeGames.delete(message.channel.id);
    });

  } catch (error) {
    console.error('Error in startQuizGame:', error);
    await message.reply('❌ **حدث خطأ أثناء بدء اللعبة.**');
    activeGames.delete(message.channel.id);
  }
}

// Handle quiz commands
async function handleQuizCommand(message, command) {
  const gameType = command.replace('-', '');

  if (quizData[gameType]) {
    await startQuizGame(message, gameType);
  }
}

// Get active games status
function getActiveGamesStatus() {
  return activeGames.size;
}

module.exports = {
  handleQuizCommand,
  getActiveGamesStatus,
  quizData
};
