const shell = require('shelljs'),
      ora = require('ora'),
      chalk = require('chalk'),
      config = require('./config')

function cleanup() {
  const tempDirectory = config.getTempDirectory('')
  shell.rm('-rf', tempDirectory)
  shell.mkdir('-p', tempDirectory)
}

module.exports = cleanup
