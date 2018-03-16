FROM node:9
RUN npm install gulp-cli -g

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json package-lock.json /usr/src/app/
RUN npm i

COPY . /usr/src/app/

# Run the build script (if any)
RUN npm run build

CMD ["npm", "start"]
