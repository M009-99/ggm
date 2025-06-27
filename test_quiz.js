// Test file to demonstrate quiz functionality
const { quizData } = require('./games/quiz.js');

console.log('🧩 Quiz Games Test\n');

// Test each game category
Object.keys(quizData).forEach(gameType => {
  const game = quizData[gameType];
  console.log(`🎮 ${game.name} (${gameType})`);
  console.log(`   Questions: ${game.questions.length}`);
  
  // Show first question as example
  if (game.questions.length > 0) {
    const firstQuestion = game.questions[0];
    console.log(`   Example: ${firstQuestion.image}`);
    console.log(`   Answers: ${firstQuestion.answers.join(', ')}`);
  }
  console.log('');
});

console.log('✅ All quiz games loaded successfully!');
console.log('\n📋 Available Commands:');
console.log('-اسرع, -دين, -اعلام, -شخصية, -ترجم, -عواصم, -تمويه, -رتب, -براند');

console.log('\n🔧 To add real images:');
console.log('1. Upload images to Imgur or similar service');
console.log('2. Replace example URLs in games/quiz.js');
console.log('3. Add more questions to each category');
console.log('4. Test with your Discord bot!');
