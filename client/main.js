import {
  establishConnection,
  establishPayer,
  checkProgram,
  sayHello,
  reportAccounts,
} from './client.js';

async function main() {
  try {
    // Establish connection to the cluster
    await establishConnection();

    // Determine who pays for the fees
    await establishPayer();

    // Check if the program has been deployed
    await checkProgram();

    // Say hello to an account
    await sayHello();

    // Find out how many times that account has been greeted
    await reportAccounts();
  } catch (err) {
    console.log(err);
  }
}

main().then(() => console.log("Finished"));