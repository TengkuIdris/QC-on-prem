## Installation & Setup

```bash
# install package
$ yarn

# run docker
$ docker-compose up -d

# Migrate database

$ npx prisma migrate deploy
```

## Running the app

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

## Test

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

