# Use an official node runtime as a parent image
FROM node:20-alpine

# Create app directory
RUN mkdir -p /usr/src
WORKDIR /usr/src

COPY package.json /usr/src/
COPY package-lock.json /usr/src/

RUN npm install

# Bundle app source
COPY . /usr/src

# Generate version information
RUN if [ -f ./baseversion ]; then \
         RELEASEVERSION=$(($(cat ./baseversion) + 0)); \
     else \
         RELEASEVERSION=0; \
     fi \
     && RELEASEDATE=$(date "+%a %b %d %T %Y") \
     && RELEASEDATEISO=$(date -u "+%Y-%m-%dT%H:%M:%SZ") \
     && echo "RELEASEVERSION=$RELEASEVERSION" > ./.env.production \
     && echo "RELEASEDATE=$RELEASEDATE" >> ./.env.production \
     && echo "NEXT_PUBLIC_RELEASEDATE=$RELEASEDATE" >> ./.env.production \
     && echo "RELEASEDATEISO=$RELEASEDATEISO" >> ./.env.production

# Generate Prisma client
RUN npx prisma generate

RUN npm run build
EXPOSE 3000

CMD sh -c "npm run wait-for-email-all-accounts & npm start"