#!/usr/bin/env node

const { ArgumentParser } = require('argparse')
const { version } = require('../package.json')
const prompt = require('../lib/prompt')
const tarikSp2dk = require('../lib/tarik-sp2dk')

const parser = new ArgumentParser({
  description: 'Tarik SP2DK',
})

parser.add_argument('-v', '--version', { action: 'version', version })
parser.add_argument('-u', '--username', { help: 'Username SIKKA' })
parser.add_argument('-p', '--password', { help: 'Password SIKKA' })
parser.add_argument('-o', '--output', { help: 'Nama output file: Default "SP2DK.xlsx"' })

const args = parser.parse_args()

const run = async () => {
  if (!args.username) args.username = await prompt('Username: ')
  if (!args.password) args.password = await prompt('Password: ', { muted: true })
  if (!args.output) args.output = await prompt('Output:[SP2DK.xlsx] ')
  if (!args.output) args.output = 'SP2DK.xlsx'
  console.time('Tarik SP2DK')
  await tarikSp2dk(args)
  console.timeEnd('Tarik SP2DK')
}

run()