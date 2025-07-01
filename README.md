# xPortal Daily Task command-line tool

A simple TypeScript app to automate the claiming of your daily xPortal XP on MultiversX.

## Prerequisites

NodeJS must be installed on your system.

## Security

As you will have to provide your keys to this app, please store them the right way on a well secured machine.

This app doesn't handle wallets protected by Guardian. If this is something wanted, feel free to contact me.

## Installation

```
git clone https://github.com/BubuMVX/mvx-xportal-daily-task.git
cd mvx-xportal-daily-task
npm install
```

## Configuration

- Put your wallets in JSON format in the `wallets` folder
- Copy `src/wallets.example.ts` to `src/wallets.ts`
- Edit `src/wallets.ts` and add the filenames and passwords of your wallets

## Run

```
npm run start
```

## Crontab

Run it once per day.

```
0 0 * * * cd /path/to/mvx-xportal-dailytask && npm run start
```

## Claim XP from a browser

https://xportal.artmakers.io/
