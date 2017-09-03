const fs = require('fs'),
      path = require('path'),
      shell = require('shelljs')

function getMainScripts(cwd) {
  const gulpfilePath = path.join(cwd, 'gulpfile.js')
  const gulpfileBabelPath = path.join(cwd, 'gulpfile.babel.js')

  let build = null
  let dev = null
  let prestart = null
  let start = null
  let main = null

  if (fs.existsSync(gulpfilePath) || fs.existsSync(gulpfileBabelPath)) {
    let gulpTasks = shell.exec('gulp --tasks-simple', {silent: true}).stdout.split("\n").filter((t) => t !== '')

    if (gulpTasks.indexOf('build')) {
      build = 'gulp build --production'
      prestart = 'npm run build'
      start = 'serve ./dist --port ${PORT:-3000}'
    }
    else if (gulpTasks.indexOf('default')) {
      build = 'gulp --production'
      prestart = 'npm run build'
      start = 'serve ./dist --port ${PORT:-3000}'
    }

    if (gulpTasks.indexOf('serve')) {
      dev = 'gulp serve'
    }
  }

  let mainCandidates =  fs.readdirSync(cwd)
    .filter((f) => f.endsWith('.js'))
  if( mainCandidates.length ) {
    main = mainCandidates.pop()
    start = start || 'node .'
    dev = dev || 'nodemon .'
  }

  if( ! main && ! build && ! start ) {
    start = 'serve . --port ${PORT:-3000}'
    dev = 'serve . --port ${PORT:-3000}'
  }

  return { build, dev, prestart, start, main }
}

module.exports = { getMainScripts }
