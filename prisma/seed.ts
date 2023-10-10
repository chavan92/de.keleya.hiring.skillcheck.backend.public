import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const seedData = [
  {
    name: 'Brad Pitt',
    email: 'brad@gmail.com',
    confirmed_email: true,
    credentials: {
      create: {
        hash: '435d1f83baddbf3fffa2db31e9d23ac6a05034d750344cbffdd07b42d96f7603',
      },
    },
  },
  {
    name: 'Tom Hanks',
    email: 'tom@gmail.com',
    confirmed_email: true,
    credentials: {
      create: {
        hash: '23f4961f89ef94d055fe6153946223551d7a389b39ae1830ffe2b9c127e4bbcc',
      },
    },
  },
  {
    name: 'Emma Watson',
    email: 'emma@gmail.com',
    confirmed_email: true,
    credentials: {
      create: {
        hash: 'cb2696bbabe8abe149b961df815d86a8c8bb4b1063bd050b70aae11f9d51cc08',
      },
    },
  },
  {
    name: 'Anne Hathway',
    email: 'anne@gmail.com',
    confirmed_email: true,
    credentials: {
      create: {
        hash: '4b04328d9a43aec9b9f01cc1d8ad06b64b00825ae86a395b706d898c7b9342d0',
      },
    },
  },
];

async function main() {
  for (const user of seedData) {
    await prisma.user.create({ data: user });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
