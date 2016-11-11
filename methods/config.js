var inquirer = require('inquirer');
const fs = require('fs');
const CFG_NAME = 'aerolab-cli-config.json';
var shell = require('shelljs');

const HOME_PATH = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
var HOME_AEROLAB = `${HOME_PATH}/.aerolab`;
const mailInput = 'Insert your Gitlab e-mail:';
const tokenInput = `Insert Aerolab's token:`;
const apiRouteInput = 'Insert link to the API route:';

class Config {

  // Sets up the config
  static checkAndSetUpConfig() {
    return new Promise(function (resolve, reject) {
      if (!hasConfig()) {
        this.createConfig().then( () => resolve(true));
      } else {
        resolve(true);
      }
    });
  }

  static createConfig() {
    checkOrCreateDirectory();

    return new Promise( function (resolve, reject) {
      getUserInput(mailInput).then( mail => {
        getUserInput(tokenInput).then(token => {
          getUserInput(apiRouteInput).then(apiRoute => {
            let url = formatUrl(apiRoute);
            let json = {
              mail: mail,
              token: token,
              api: url
            };

            shell.exec(`echo '${JSON.stringify(json)}' > ${HOME_AEROLAB}/${CFG_NAME}`);
            resolve('done');
          })
        })
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
