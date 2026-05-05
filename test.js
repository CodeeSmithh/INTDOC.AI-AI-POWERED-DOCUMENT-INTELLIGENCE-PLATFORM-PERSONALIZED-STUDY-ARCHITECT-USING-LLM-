import fs from 'fs';
async function run() {
  try {
    const response = await fetch('http://localhost:3001/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ textToAnalyze: 'This is a test document about artificial intelligence. AI is cool. It uses neural networks. You can train it with data.' })
    });
    console.log("Status:", response.status);
    const data = await response.text();
    fs.writeFileSync('test-output.json', data);
  } catch (err) {
    console.error(err);
  }
}
run();
