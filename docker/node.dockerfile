FROM node:8
RUN npm install gulp-cli -g

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/
RUN npm i

COPY . /usr/src/app/

CMD ["npm", "start"]
