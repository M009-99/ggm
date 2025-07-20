// Button Game - Find the green button
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const config = require('../config.js');
// Load allowedRoleIds from config.json
const { allowedRoleIds } = require('../config.json');
const { pointsManager } = require('../points.js');

// Game state
let buttonGameActive = false;

// Main game handler
async function handleButtonGame(message) {
  try {
    // Check if a game is already active
    if (buttonGameActive) {
      await message.reply('⚠️ **هناك لعبة زر جارية بالفعل!**');
      return;
    }

    // Set game as active
    buttonGameActive = true;

    // Create a 5x5 grid of buttons (25 buttons total)
    const rows = [];
    const buttons = [];

    // Randomly select one button to be green (winning button)
    const greenButtonIndex = Math.floor(Math.random() * 25);

    // Create all buttons
    for (let i = 0; i < 25; i++) {
      const isGreenButton = i === greenButtonIndex;
      const button = new ButtonBuilder()
        .setCustomId(`button_${i}`)
        .setStyle(ButtonStyle.Secondary) // All buttons start as gray
        .setLabel('⬛');

      buttons.push(button);
    }

    // Arrange buttons in 5 rows of 5 buttons each
    for (let i = 0; i < 5; i++) {
      const row = new ActionRowBuilder().addComponents(
        buttons.slice(i * 5, (i + 1) * 5)
      );
      rows.push(row);
    }

    // Create the embed message
    const embed = new EmbedBuilder()
      .setTitle('🎮 لعبة الزر')
      .setDescription('اسرع شخص يضغط على الزر الأخضر يفوز في اللعبة. سيظهر الزر الأخضر بعد 3 ثوان!')
      .setColor(config.button.embedColor)
      .setFooter({ text: 'لديك 30 ثانية للعثور على الزر الأخضر' });

    // Send the message with the buttons
    const gameMessage = await message.channel.send({
      embeds: [embed],
      components: rows,
    });

    // Wait 3 seconds before showing the green button
    setTimeout(async () => {
      // Update the button to be green
      const updatedRows = [...rows];
      const rowIndex = Math.floor(greenButtonIndex / 5);
      const buttonIndex = greenButtonIndex % 5;

      const newRow = new ActionRowBuilder();
      for (let i = 0; i < 5; i++) {
        if (i === buttonIndex) {
          newRow.addComponents(
            new ButtonBuilder()
              .setCustomId(`button_${rowIndex * 5 + i}`)
              .setStyle(ButtonStyle.Success)
              .setLabel('🎯')
          );
        } else {
          newRow.addComponents(updatedRows[rowIndex].components[i]);
        }
      }

      updatedRows[rowIndex] = newRow;

      // Update the message with the green button
      await gameMessage.edit({
        embeds: [
          new EmbedBuilder()
            .setTitle('🎮 لعبة الزر')
            .setDescription('اضغط على الزر الأخضر بسرعة للفوز!')
            .setColor(config.button.embedColor)
            .setFooter({ text: 'لديك 30 ثانية للعثور على الزر الأخضر' })
        ],
        components: updatedRows,
      });

      // Create a collector to listen for button clicks
      const collector = gameMessage.createMessageComponentCollector({
        time: 30000, // 30 seconds timeout
      });

      // Handle button clicks
      collector.on('collect', async (interaction) => {
        // Check if the clicked button is the green one
        if (interaction.customId === `button_${greenButtonIndex}`) {
          // Stop the collector
          collector.stop('winner');

          // Award points to the winner
          const newPoints = await pointsManager.awardWin(interaction.user.id);

          // Announce the winner
          await gameMessage.edit({
            embeds: [
              new EmbedBuilder()
                .setTitle('🎮 لعبة الزر')
                .setDescription(`👑 ${interaction.user} فاز في اللعبة!\n\n🏆 **تم منح نقطة واحدة للفائز! النقاط الحالية: ${newPoints}**`)
                .setColor('#FFD700')
            ],
            components: disableAllButtons(updatedRows),
          });

          // Reply to the interaction
          await interaction.reply({
            content: `🎉 مبروك! لقد فزت في اللعبة وحصلت على نقطة واحدة!`,
            ephemeral: true,
          });

          // Reset game state
          buttonGameActive = false;
        } else {
          // Wrong button clicked
          await interaction.reply({
            content: `❌ هذا ليس الزر الصحيح! حاول مرة أخرى.`,
            ephemeral: true,
          });
        }
      });

      // Handle collector end event
      collector.on('end', async (collected, reason) => {
        if (reason !== 'winner') {
          // No winner, time expired
          await gameMessage.edit({
            embeds: [
              new EmbedBuilder()
                .setTitle('🎮 لعبة الزر')
                .setDescription('⏱️ انتهى الوقت! لم يفز أحد في اللعبة.')
                .setColor('#FF0000')
            ],
            components: disableAllButtons(updatedRows),
          });

          // Reset game state
          buttonGameActive = false;
        }
      });
    }, 3000); // Show green button after 3 seconds

  } catch (error) {
    console.error('Error in button game:', error);
    message.channel.send('⚠️ حدث خطأ أثناء تشغيل اللعبة. يرجى المحاولة مرة أخرى.');
    buttonGameActive = false;
  }
}

// Helper function to disable all buttons
function disableAllButtons(rows) {
  return rows.map(row => {
    const newRow = new ActionRowBuilder();
    row.components.forEach(button => {
      newRow.addComponents(
        ButtonBuilder.from(button).setDisabled(true)
      );
    });
    return newRow;
  });
}

// Export functions
module.exports = {
  handleButtonGame,
  isGameActive: () => buttonGameActive
};
