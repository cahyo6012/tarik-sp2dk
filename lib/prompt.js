const readline = require('readline')

module.exports = (query, { muted = false } = {}) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  if (muted) rl.input.on('keypress', (c, k) => {
    const len = rl.line.length
    readline.moveCursor(rl.output, -len, 0)
    readline.clearLine(rl.output, 1)
    for (let i = 0; i < len; i++) rl.output.write('*')
  })

  return new Promise(resolve => rl.question(query, ans => {
    rl.close()
    resolve(ans)
  }))
}