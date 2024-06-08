# xPortal Daily Task command-line tool

A simple TypeScript app to automate the claiming of your daily xPortal XP on MultiversX.

## Installation

```
git clone https://github.com/grobux/mvx-xportal-daily-task.git
cd mvx-xportal-daily-task
npm install
```

## Configuration

- Put your wallets in JSON format in the `wallets` folder
- Copy `src/wallets.example.ts` to `src/wallets.ts`
- Edit `src/wallets.ts` and add your wallets filenames and passwords

## Run

```
npm run start
```

## Crontab

Execute it once per day.

```
0 0 * * * cd /path/to/mvx-xportal-dailytask && npm run start
```

## Claim from a browser

https://xportal.artmakers.io/
