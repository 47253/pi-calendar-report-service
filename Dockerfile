FROM node:16

# Create app directory
WORKDIR /usr/src/app

RUN apt-get update
RUN apt-get install build-essential chrpath libssl-dev libxft-dev -y
RUN apt-get install libfreetype6 libfreetype6-dev -y
RUN apt-get install libfontconfig1 libfontconfig1-dev -y

# Bundle app source
COPY . .

# If you are building your code for production
# RUN npm ci --only=production
RUN npm install

EXPOSE 8080
CMD [ "node", "index.js" ]