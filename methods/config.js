var inquirer = require('inquirer');
const fs = require('fs');
const CFG_NAME = 'aerolab-cli-config.json';
var shell = require('shelljs');

const HOME_PATH = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
var HOME_AEROLAB = `${HOME_PATH}/.aerolab`;

const nameInput = 'What\'s your name?';
const mailInput = 'Insert your email at Aerolab?';
const dokkuInput = 'What\'s the URL for the Dokku Server?';

class Config {

  // Sets up the config
  static checkAndSetUpConfig() {
    return new Promise(function (resolve, reject) {
      if (!hasConfig()) {
        Config.createConfig().then( () =>
          resolve(true));
      } else {
        resolve(true);
      }
    });
  }

  static createConfig() {
    checkOrCreateDirectory();

    return new Promise( function (resolve, reject) {
      getUserInput(nameInput).then( mail => {
        getUserInput(mailInput).then( mail => {
          getUserInput(dokkuInput).then( dokku => {
            let json = { name, mail, dokku };

            shell.exec(`echo '${JSON.stringify(json)}' > ${HOME_AEROLAB}/${CFG_NAME}`);
            resolve('done');
          })
        });
      });
    })
  }

  static readConfigFile() {
    return (JSON.parse(fs.readFileSync(`${HOME_AEROLAB}/${CFG_NAME}`, 'utf8')));
  }
}

function getInquirerOptions(input) {
  return {
    type: 'input',
    name: 'answer',
    message: input,
  }
}

function getUserInput(input) {
  return new Promise( function (resolve, reject) {
    inquirer.prompt(getInquirerOptions(input)).then( function (answer) {

      let userAnswer = answer.answer;
      resolve(userAnswer);
    })
  });
}

function checkOrCreateDirectory() {
  if (!fs.existsSync(HOME_AEROLAB)){
    fs.mkdirSync(HOME_AEROLAB);
  }
}

function hasConfig() {
  checkOrCreateDirectory();

  let files = fs.readdirSync(HOME_AEROLAB);
  let filteredArray = files.filter(f => f === CFG_NAME);
  return filteredArray.length >= 1;
}

// adding http if user didn't add it and removing possible backslash in the end.
function formatUrl(url) {
  let formattedUrl = url;
  if (!url.startsWith(`http`)) {
    formattedUrl = "http://" + url;
  }

  if (url.endsWith('/')) {
    formattedUrl = formattedUrl.substring(0, formattedUrl.length-1);
  }

  return formattedUrl;
}

module.exports = Config;
