FROM node:16

# Create app directory
WORKDIR /usr/src/app

# Bundle app source
COPY . .

# If you are building your code for production
# RUN npm ci --only=production
RUN npm install

EXPOSE 8080
CMD [ "node", "index.js" ]