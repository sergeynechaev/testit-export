# `rm-testit-export`

Script for import all test suites and cases from [TestIT](https://testit.software), including pictures.

> For each export attempt a new folder is created. Each project has it's own .json file, the total projects-list.json file is also created. All pictures and attachments are put in `attachments` folder.

## Settings

Create an `API secret key` in TestIT user Profile Settings and put it in `.env` file into `TESTIT_API_KEY` var:

```
# .env
TESTIT_API_KEY=your-key-here
```

## Usage

```
make testit-export
```
